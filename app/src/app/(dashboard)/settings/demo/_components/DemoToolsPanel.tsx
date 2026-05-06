// ==============================================================================
// LIC v2 — DemoToolsPanel (Client Component, Phase 17 F2)
//
// Boutons "Purger" / "Recharger" avec dialog de confirmation. Chaque action
// invalide /settings/demo (revalidatePath côté Server Action) — la page
// est re-rendue avec les compteurs mis à jour.
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
  DialogTrigger,
} from "@/components/ui/dialog";

import { purgeDemoAction, reloadDemoAction } from "../_actions";

export function DemoToolsPanel(): React.JSX.Element {
  return (
    <section className="border-border bg-surface-1 space-y-4 rounded-lg border p-4">
      <h3 className="text-foreground text-sm font-semibold">Actions</h3>
      <div className="flex flex-wrap gap-3">
        <ActionButton
          label="Purger les données démo"
          variant="destructive"
          confirmTitle="Purger les données démo ?"
          confirmDescription={
            <>
              <p>
                Cette action <strong>vide en cascade</strong> les tables clients, licences,
                renouvellements, notifications, alertes, fichiers, audit, volumes, batchs.
              </p>
              <p className="mt-2">
                Les utilisateurs, settings et référentiels (pays, régions, devises, équipe,
                catalogue) sont préservés.
              </p>
              <p className="mt-2 text-amber-400">
                <strong>Cette action est irréversible en prod.</strong>
              </p>
            </>
          }
          confirmLabel="Purger"
          run={purgeDemoAction}
        />
        <ActionButton
          label="Recharger les données démo"
          variant="default"
          confirmTitle="Recharger les données démo ?"
          confirmDescription={
            <p>
              Réexécute le pipeline seed (clients, licences, catalogue, notifications). Idempotent —
              les seeds early-return s&apos;ils sont déjà peuplés.
            </p>
          }
          confirmLabel="Recharger"
          run={reloadDemoAction}
        />
      </div>
    </section>
  );
}

function ActionButton({
  label,
  variant,
  confirmTitle,
  confirmDescription,
  confirmLabel,
  run,
}: {
  readonly label: string;
  readonly variant: "default" | "destructive";
  readonly confirmTitle: string;
  readonly confirmDescription: React.ReactNode;
  readonly confirmLabel: string;
  readonly run: () => Promise<void>;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onConfirm = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          await run();
          setOpen(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
      })();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>{label}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{confirmTitle}</DialogTitle>
        </DialogHeader>
        <div className="text-sm">{confirmDescription}</div>
        {error.length > 0 && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOpen(false);
            }}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button type="button" variant={variant} onClick={onConfirm} disabled={pending}>
            {pending ? "..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
