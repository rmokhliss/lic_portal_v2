// ==============================================================================
// LIC v2 — Module augmentation Auth.js v5 (F-07)
//
// Étend les interfaces User, Session et JWT pour exposer nos champs custom :
// matricule, nom, prenom, role, mustChangePassword, tokenVersion.
// Display calculé dans le callback session() (règle L9).
// ==============================================================================

import "next-auth";
import "next-auth/jwt";

export type AuthRole = "SADMIN" | "ADMIN" | "USER";

declare module "next-auth" {
  interface User {
    id?: string;
    email?: string | null;
    matricule: string;
    nom: string;
    prenom: string;
    role: AuthRole;
    mustChangePassword: boolean;
    tokenVersion: number;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      matricule: string;
      nom: string;
      prenom: string;
      display: string;
      role: AuthRole;
      mustChangePassword: boolean;
      tokenVersion: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AuthRole;
    matricule: string;
    nom: string;
    prenom: string;
    mustChangePassword: boolean;
    tokenVersion: number;
  }
}
