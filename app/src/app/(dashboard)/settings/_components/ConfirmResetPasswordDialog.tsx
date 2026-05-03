// ==============================================================================
// LIC v2 — ConfirmResetPasswordDialog (Phase 2.B.bis EC-08)
//
// Client Component minimaliste pour confirmer un reset password admin avant
// invocation de la Server Action. Réutilise Dialog + Button variant
// destructive (pas d'install nouveau composant shadcn/alert-dialog cf. Stop 3 D6).
// ==============================================================================

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmResetPasswordDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Format L9 — affiché dans le message de confirmation. */
  readonly userDisplay: string;
  readonly pending: boolean;
  readonly onConfirm: () => void;
}

export function ConfirmResetPasswordDialog({
  open,
  onOpenChange,
  userDisplay,
  pending,
  onConfirm,
}: ConfirmResetPasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réinitialiser le mot de passe ?</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Un nouveau mot de passe va être généré pour{" "}
          <strong className="text-foreground">{userDisplay}</strong>. Toutes ses sessions actives
          seront immédiatement invalidées et l'utilisateur devra changer le mot de passe à sa
          prochaine connexion.
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? "Réinitialisation…" : "Réinitialiser"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
