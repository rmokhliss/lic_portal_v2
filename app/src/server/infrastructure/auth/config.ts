// ==============================================================================
// LIC v2 — Auth.js v5 — config sans adapter Drizzle (F-07)
//
// Le brief F-07 mentionnait @auth/drizzle-adapter, écarté après analyse :
// - Strategy JWT : aucune table sessions/accounts/verification_tokens écrite
// - Lookup user : géré par Credentials.authorize() avec SELECT direct sur lic_users
// - L'adapter forcerait un mapping de colonnes inutilisées (emailVerified, etc.)
//
// Si OAuth ou magic links sont ajoutés un jour, réintégrer l'adapter et créer
// les tables Auth.js standards via une migration dédiée.
// ==============================================================================

import bcryptjs from "bcryptjs";
import { and, eq } from "drizzle-orm";
import type { NextAuthConfig } from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { LoginSchema } from "@s2m-lic/shared/schemas/auth.schema";
import { db } from "@/server/infrastructure/db/client";
import { env } from "@/server/infrastructure/env";
import { createChildLogger } from "@/server/infrastructure/logger";
import { users } from "@/server/modules/user/adapters/postgres/schema";

const log = createChildLogger("auth");

/** Erreur typée portant le code SPX-LIC-002 (identifiants invalides).
 *  Auth.js expose `code` côté caller via `error.code` sur le retour de signIn(). */
class InvalidCredentialsError extends CredentialsSignin {
  override code = "SPX-LIC-002";
}

export const authConfig: NextAuthConfig = {
  // Pas d'adapter (cf. en-tête de fichier).
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8h sliding
    updateAge: 60 * 60, // refresh JWT toutes les heures d'activité
  },
  cookies: {
    sessionToken: {
      name: "spx-lic.session-token",
      options: {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      },
    },
  },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) throw new InvalidCredentialsError();

        const rows = await db
          .select({
            id: users.id,
            email: users.email,
            matricule: users.matricule,
            nom: users.nom,
            prenom: users.prenom,
            role: users.role,
            passwordHash: users.passwordHash,
            mustChangePassword: users.mustChangePassword,
            tokenVersion: users.tokenVersion,
          })
          .from(users)
          .where(and(eq(users.email, parsed.data.email), eq(users.actif, true)))
          .limit(1);

        const user = rows[0];
        if (!user) throw new InvalidCredentialsError();

        const ok = await bcryptjs.compare(parsed.data.password, user.passwordHash);
        if (!ok) throw new InvalidCredentialsError();

        // Update derniere_connexion (fire-and-forget hors transaction auth).
        await db.update(users).set({ derniereConnexion: new Date() }).where(eq(users.id, user.id));

        log.info({ userId: user.id, matricule: user.matricule }, "Login success");

        // Retour : objet exposé au callback jwt() pour insertion dans le token.
        return {
          id: user.id,
          email: user.email,
          matricule: user.matricule,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      // À sign-in, user est défini ; sinon undefined (re-call sur token existant).
      // ESLint pense user toujours défini à cause de l'augmentation de type ;
      // en pratique Auth.js v5 le passe undefined sur les re-calls.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Auth.js v5 typing quirk : user peut être undefined au runtime malgré le type strict
      if (user) {
        token.id = user.id ?? "";
        token.role = user.role;
        token.matricule = user.matricule;
        token.nom = user.nom;
        token.prenom = user.prenom;
        token.mustChangePassword = user.mustChangePassword;
        token.tokenVersion = user.tokenVersion;
      }
      return token;
    },
    session: async ({ session, token }) => {
      // ⚠️ Vérification token_version à CHAQUE request authentifiée :
      // requête BD obligatoire pour permettre la révocation force-logout.
      // Coût acceptable pour LIC mono-tenant interne. À ré-évaluer si la
      // latence dépasse 50ms sur des charges anormales.
      const dbUser = await db
        .select({
          tokenVersion: users.tokenVersion,
          mustChangePassword: users.mustChangePassword,
        })
        .from(users)
        .where(eq(users.id, token.id))
        .limit(1);

      const fresh = dbUser[0];
      // Disable optional-chain : on a besoin du narrowing TS sur `fresh` plus
      // bas (sinon TS pense `fresh` peut être undefined dans `fresh.mustChangePassword`).
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (fresh === undefined || fresh.tokenVersion !== token.tokenVersion) {
        // Token révoqué : retourner une session vide invalide la session côté
        // Auth.js — les helpers requireAuth/requireAuthPage refuseront.
        // (on ne throw PAS pour éviter les 500 sur des sessions stale)
        return { ...session, user: null as unknown as typeof session.user };
      }

      // Reconstruction de l'objet user de session. emailVerified=null pour
      // satisfaire le type AdapterUser hérité (Auth.js v5 quirk beta).
      session.user = {
        emailVerified: null,
        id: token.id,
        email: session.user.email,
        role: token.role,
        matricule: token.matricule,
        nom: token.nom,
        prenom: token.prenom,
        // Règle L9 : "Prénom NOM (MAT-XXX)"
        display: `${token.prenom} ${token.nom.toUpperCase()} (${token.matricule})`,
        // mustChangePassword lu depuis BD (frais), pas depuis JWT (peut être stale)
        mustChangePassword: fresh.mustChangePassword,
        tokenVersion: token.tokenVersion,
      };
      return session;
    },
  },
  trustHost: env.AUTH_TRUST_HOST,
  secret: env.AUTH_SECRET,
};
