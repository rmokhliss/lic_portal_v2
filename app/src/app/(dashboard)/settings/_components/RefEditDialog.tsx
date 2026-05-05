// ==============================================================================
// LIC v2 — RefEditDialog (Phase 14 — DETTE-LIC-006 résolue)
//
// Composant générique pour éditer une ligne d'un référentiel SADMIN
// (régions, pays, devises, langues, types contact, équipe). Évite la
// duplication de 6 EditDialog quasi-identiques.
//
// Pattern :
//   - Bouton "Modifier" → ouvre dialog
//   - Form auto-généré depuis `fields` (avec defaultValue pré-rempli)
//   - Submit → appel `onSubmit(payload)` (Server Action wrapper)
//   - Convention : champ vide → `null` si nullable, `undefined` si optional
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface RefFieldDef {
  readonly name: string;
  readonly label: string;
  readonly type?: "text" | "email" | "select";
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  readonly defaultValue?: string;
  readonly required?: boolean;
  /** Si true : input affiché mais désactivé (sélecteur immuable de la ligne). */
  readonly immutable?: boolean;
  /** Si true : champ peut être effacé (envoie `null` au use-case). */
  readonly nullable?: boolean;
  readonly maxLength?: number;
}

export interface RefEditDialogProps {
  readonly title: string;
  readonly fields: readonly RefFieldDef[];
  readonly onSubmit: (payload: Record<string, string | null>) => Promise<void>;
}

export function RefEditDialog({ title, fields, onSubmit }: RefEditDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string | null> = {};
    for (const f of fields) {
      const raw = fd.get(f.name);
      const value = typeof raw === "string" ? raw.trim() : "";
      if (f.immutable === true) {
        payload[f.name] = f.defaultValue ?? value;
        continue;
      }
      if (value.length === 0) {
        if (f.nullable === true) payload[f.name] = null;
        // Si pas nullable + valeur vide → champ omis (use-case considère = inchangé).
        continue;
      }
      payload[f.name] = value;
    }
    startTransition(() => {
      void (async () => {
        try {
          await onSubmit(payload);
          setError("");
          setOpen(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1">
              <Label htmlFor={f.name}>{f.label}</Label>
              {f.type === "select" && f.options !== undefined ? (
                <select
                  id={f.name}
                  name={f.name}
                  required={f.required ?? false}
                  defaultValue={f.defaultValue ?? ""}
                  disabled={f.immutable === true}
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:opacity-60"
                >
                  {f.nullable === true && !f.required && <option value="">—</option>}
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={f.name}
                  name={f.name}
                  type={f.type ?? "text"}
                  required={f.required ?? false}
                  defaultValue={f.defaultValue ?? ""}
                  maxLength={f.maxLength}
                  disabled={f.immutable === true}
                  className={f.immutable === true ? "font-mono" : undefined}
                />
              )}
            </div>
          ))}
          {error.length > 0 && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
