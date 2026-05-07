// ==============================================================================
// LIC v2 — UserDialog (Phase 2.B.bis EC-08)
//
// Client Component partagé create / edit (cf. Stop 3 D1). Form contrôlé via
// FormData + Server Action. useTransition pour bouton désactivé pendant la
// requête.
//
// Différences mode :
//   - create : champ matricule visible (saisi SADMIN, pattern MAT-NNN)
//   - edit   : matricule absent ; email read-only (immuable post-création)
//
// Le mot de passe généré post-création est REMONTÉ au parent via
// onPasswordRevealed pour ouvrir PasswordRevealDialog (composant dédié,
// cf. Stop 3 D4). UserDialog ferme implicitement après succès.
// ==============================================================================

"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createUserAction, updateUserAction } from "../_actions";

import type { UserDTO, UserRoleClient } from "./settings-users-types";

export interface UserDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: "create" | "edit";
  /** Requis si mode="edit", ignoré sinon. */
  readonly user?: UserDTO;
  /** Appelé après succès en mode create avec le mot de passe en clair. */
  readonly onPasswordRevealed?: (newPassword: string, userDisplay: string) => void;
}

export function UserDialog({
  open,
  onOpenChange,
  mode,
  user,
  onPasswordRevealed,
}: UserDialogProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (mode === "create") {
      const payload: Record<string, unknown> = {
        matricule: strReq(fd.get("matricule")),
        nom: strReq(fd.get("nom")),
        prenom: strReq(fd.get("prenom")),
        email: strReq(fd.get("email")),
        role: strReq(fd.get("role")) || "USER",
      };
      const tel = strOpt(fd.get("telephone"));
      if (tel !== undefined) payload.telephone = tel;

      startTransition(() => {
        void (async () => {
          try {
            const r = await createUserAction(payload);
            if (!r.success) {
              setError(r.error);
              return;
            }
            setError("");
            onOpenChange(false);
            if (onPasswordRevealed) {
              onPasswordRevealed(r.data.generatedPassword, r.data.user.display);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur");
          }
        })();
      });
      return;
    }

    // mode === "edit"
    if (!user) {
      setError("Utilisateur manquant en mode édition");
      return;
    }
    const patch: Record<string, unknown> = { userId: user.id };
    const newNom = strReq(fd.get("nom"));
    if (newNom !== user.nom) patch.nom = newNom;
    const newPrenom = strReq(fd.get("prenom"));
    if (newPrenom !== user.prenom) patch.prenom = newPrenom;
    const newRole = strReq(fd.get("role")) as UserRoleClient;
    if (newRole !== user.role) patch.role = newRole;

    startTransition(() => {
      void (async () => {
        try {
          const r = await updateUserAction(patch);
          if (!r.success) {
            setError(r.error);
            return;
          }
          setError("");
          onOpenChange(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Créer un utilisateur" : "Modifier l'utilisateur"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Matricule — création seulement (pattern MAT-NNN) */}
          {mode === "create" && (
            <div className="space-y-1">
              <Label htmlFor="matricule">Matricule</Label>
              <Input
                id="matricule"
                name="matricule"
                required
                placeholder="MAT-042"
                pattern="^MAT-\d{3,}$"
                title="Format attendu : MAT- suivi de 3 chiffres ou plus"
                maxLength={20}
              />
              <p className="text-muted-foreground text-xs">
                Format MAT-NNN. Aligné sur l'identifiant RH S2M.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="prenom">Prénom</Label>
            <Input
              id="prenom"
              name="prenom"
              required
              maxLength={100}
              defaultValue={mode === "edit" ? (user?.prenom ?? "") : ""}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="nom">Nom</Label>
            <Input
              id="nom"
              name="nom"
              required
              maxLength={100}
              defaultValue={mode === "edit" ? (user?.nom ?? "") : ""}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              readOnly={mode === "edit"}
              maxLength={200}
              defaultValue={mode === "edit" ? (user?.email ?? "") : ""}
            />
            {mode === "edit" && (
              <p className="text-muted-foreground text-xs">
                L'email n'est pas modifiable. Pour changer, créer un nouveau compte et désactiver
                l'ancien.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="role">Rôle</Label>
            <select
              id="role"
              name="role"
              required
              defaultValue={mode === "edit" ? (user?.role ?? "USER") : "USER"}
              className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="USER">USER (lecture + actions courantes)</option>
              <option value="ADMIN">ADMIN (gestion clients/licences)</option>
              <option value="SADMIN">SADMIN (administration complète)</option>
            </select>
          </div>

          {mode === "create" && (
            <div className="space-y-1">
              <Label htmlFor="telephone">Téléphone (optionnel)</Label>
              <Input id="telephone" name="telephone" type="tel" maxLength={20} />
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? mode === "create"
                  ? "Création…"
                  : "Enregistrement…"
                : mode === "create"
                  ? "Créer"
                  : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function strReq(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function strOpt(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length === 0 ? undefined : s;
}
