// ==============================================================================
// LIC v2 — SettingsUsersTable (Phase 2.B.bis EC-08)
//
// Client Component pour le contenu de /settings/users : table users + 3
// actions par row (Modifier / Toggle actif / Réinitialiser MDP) + bouton
// Ajouter en header.
//
// Orchestre les 3 sous-Dialogs :
//   - UserDialog                     (create + edit)
//   - PasswordRevealDialog           (réutilisé create + reset)
//   - ConfirmResetPasswordDialog     (confirmation avant reset)
//
// Règle self-deactivation (L11 + ADR data-model.md §lic_users) : le bouton
// « Désactiver » est désactivé si la row correspond à currentUserId. Le
// use-case throw aussi en backup (SPX-LIC-723), mais l'UX évite l'erreur.
// ==============================================================================

"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { resetUserPasswordAction, toggleUserActiveAction } from "../_actions";

import { ConfirmResetPasswordDialog } from "./ConfirmResetPasswordDialog";
import { PasswordRevealDialog } from "./PasswordRevealDialog";
import { UserDialog } from "./UserDialog";
import type { UserDTO } from "./settings-users-types";

export interface SettingsUsersTableProps {
  readonly rows: readonly UserDTO[];
  readonly currentUserId: string;
}

type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; user: UserDTO }
  | { kind: "confirm-reset"; user: UserDTO }
  | { kind: "reveal"; password: string; userDisplay: string; context: "create" | "reset" };

export function SettingsUsersTable({ rows, currentUserId }: SettingsUsersTableProps) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-foreground text-lg">Comptes back-office</h3>
        <Button
          size="sm"
          onClick={() => {
            setDialog({ kind: "create" });
          }}
        >
          Ajouter
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Matricule</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground text-center text-sm">
                Aucun utilisateur.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === currentUserId}
                onEdit={() => {
                  setDialog({ kind: "edit", user: u });
                }}
                onResetPassword={() => {
                  setDialog({ kind: "confirm-reset", user: u });
                }}
              />
            ))
          )}
        </TableBody>
      </Table>

      {/* UserDialog — création + édition */}
      <UserDialog
        open={dialog.kind === "create" || dialog.kind === "edit"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "none" });
        }}
        mode={dialog.kind === "edit" ? "edit" : "create"}
        user={dialog.kind === "edit" ? dialog.user : undefined}
        onPasswordRevealed={(password, userDisplay) => {
          setDialog({ kind: "reveal", password, userDisplay, context: "create" });
        }}
      />

      {/* ConfirmResetPasswordDialog */}
      <ConfirmResetForRow
        state={dialog}
        onClose={() => {
          setDialog({ kind: "none" });
        }}
        onSuccess={(password, userDisplay) => {
          setDialog({ kind: "reveal", password, userDisplay, context: "reset" });
        }}
      />

      {/* PasswordRevealDialog — réutilisé create + reset */}
      <PasswordRevealDialog
        open={dialog.kind === "reveal"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "none" });
        }}
        password={dialog.kind === "reveal" ? dialog.password : null}
        userDisplay={dialog.kind === "reveal" ? dialog.userDisplay : ""}
        context={dialog.kind === "reveal" ? dialog.context : "create"}
      />
    </>
  );
}

// ============================================================================
// Sous-composants
// ============================================================================

interface UserRowProps {
  readonly user: UserDTO;
  readonly isSelf: boolean;
  readonly onEdit: () => void;
  readonly onResetPassword: () => void;
}

function UserRow({ user, isSelf, onEdit, onResetPassword }: UserRowProps) {
  const [togglePending, startToggle] = useTransition();
  const [error, setError] = useState<string>("");

  const onToggle = () => {
    setError("");
    startToggle(() => {
      void (async () => {
        try {
          await toggleUserActiveAction({ userId: user.id });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  // Self-deactivation : bouton « Désactiver » bloqué côté UI si row=actor.
  // Le use-case throw aussi (SPX-LIC-723) en backup.
  const toggleDisabled = togglePending || (isSelf && user.actif);

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{user.matricule}</TableCell>
      <TableCell>
        {user.prenom} {user.nom}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">{user.email}</TableCell>
      <TableCell>
        <RoleBadge role={user.role} />
      </TableCell>
      <TableCell>
        <ActifBadge actif={user.actif} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Modifier
          </Button>
          <Button
            type="button"
            variant={user.actif ? "outline" : "secondary"}
            size="sm"
            disabled={toggleDisabled}
            onClick={onToggle}
            title={
              isSelf && user.actif ? "Vous ne pouvez pas vous désactiver vous-même" : undefined
            }
          >
            {user.actif ? "Désactiver" : "Activer"}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onResetPassword}>
            Reset MDP
          </Button>
        </div>
        {error !== "" && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </TableCell>
    </TableRow>
  );
}

interface ConfirmResetForRowProps {
  readonly state: DialogState;
  readonly onClose: () => void;
  readonly onSuccess: (password: string, userDisplay: string) => void;
}

function ConfirmResetForRow({ state, onClose, onSuccess }: ConfirmResetForRowProps) {
  const [pending, startTransition] = useTransition();

  if (state.kind !== "confirm-reset") {
    // Dialog rendu fermé pour qu'il soit dans l'arbre (avec animation Radix).
    return (
      <ConfirmResetPasswordDialog
        open={false}
        onOpenChange={() => {
          /* no-op */
        }}
        userDisplay=""
        pending={false}
        onConfirm={() => {
          /* no-op */
        }}
      />
    );
  }

  const onConfirm = () => {
    startTransition(() => {
      void (async () => {
        try {
          const r = await resetUserPasswordAction({ userId: state.user.id });
          if (!r.success) {
            // Erreur AppError → le Dialog reste ouvert pour permettre une
            // nouvelle tentative ; le détail est dans la console côté serveur.
            onClose();
            return;
          }
          onSuccess(r.data.newPassword, r.data.user.display);
        } catch {
          onClose();
        }
      })();
    });
  };

  return (
    <ConfirmResetPasswordDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      userDisplay={state.user.display}
      pending={pending}
      onConfirm={onConfirm}
    />
  );
}

function RoleBadge({ role }: { readonly role: UserDTO["role"] }) {
  const styles: Record<UserDTO["role"], string> = {
    SADMIN: "bg-primary/15 text-primary border-primary/40",
    ADMIN: "bg-info/15 text-info border-info/40",
    USER: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${styles[role]}`}
    >
      {role}
    </span>
  );
}

function ActifBadge({ actif }: { readonly actif: boolean }) {
  return (
    <span
      className={
        actif
          ? "inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800"
          : "inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
      }
    >
      {actif ? "Actif" : "Inactif"}
    </span>
  );
}
