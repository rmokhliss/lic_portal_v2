// ==============================================================================
// LIC v2 — /settings/smtp — Panel client (Phase 14 + Phase 18 R-19)
//
// Phase 18 R-19 — palette migrée sur les vars DS (`bg-card` / `bg-surface-1` /
// `text-foreground` / `text-muted-foreground`) au lieu de `bg-white text-spx-ink`.
// Sur le mode dark global LIC v2, l'ancien rendu donnait du texte sombre sur
// fond clair (lisible) MAIS les valeurs <dd> par défaut héritaient de la
// couleur CSS body (`var(--foreground)` = blanc) → blanc sur blanc = invisible.
// Force désormais `text-foreground` partout pour rester lisible quel que soit
// le thème actif.
// ==============================================================================

"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { testEmailAction, type TestEmailResult } from "../_actions";

export interface SmtpStatus {
  readonly mode: "smtp" | "console";
  readonly host: string | null;
  readonly port: number | null;
  readonly from: string | null;
}

export function SmtpPanel({
  status,
  canTest,
}: {
  readonly status: SmtpStatus;
  readonly canTest: boolean;
}): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  const [to, setTo] = useState("");
  const [result, setResult] = useState<TestEmailResult | null>(null);
  const [error, setError] = useState<string>("");

  const onTest = () => {
    setError("");
    setResult(null);
    startTransition(() => {
      void (async () => {
        try {
          const r = await testEmailAction({ to });
          setResult(r);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })();
    });
  };

  const isSimulated = status.mode === "console";

  return (
    <div className="space-y-4">
      <section className="border-border bg-surface-1 text-foreground rounded-lg border p-4">
        <h2 className="text-foreground text-sm font-semibold">État de la configuration</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <dt className="text-muted-foreground">Mode</dt>
          <dd>
            {isSimulated ? (
              <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
                Simulé (console)
              </span>
            ) : (
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                SMTP
              </span>
            )}
          </dd>
          <dt className="text-muted-foreground">Hôte</dt>
          <SmtpField value={status.host} placeholder="(non défini)" />
          <dt className="text-muted-foreground">Port</dt>
          <SmtpField value={status.port} placeholder="587" />
          <dt className="text-muted-foreground">Sécurisé (TLS)</dt>
          <SmtpField value={null} placeholder="false" />
          <dt className="text-muted-foreground">From</dt>
          <SmtpField value={status.from} placeholder="Licence Manager <noreply@s2m.ma>" />
        </dl>
        {isSimulated && (
          <p className="text-muted-foreground mt-3 text-xs">
            Aucun email réel n&apos;est envoyé. Définir{" "}
            <code className="bg-muted text-foreground rounded px-1">SMTP_HOST</code> dans{" "}
            <code className="bg-muted text-foreground rounded px-1">.env</code> pour activer le mode
            SMTP.
          </p>
        )}
      </section>

      {canTest && (
        <section className="border-border bg-surface-1 text-foreground rounded-lg border p-4">
          <h2 className="text-foreground text-sm font-semibold">Tester l&apos;envoi</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Envoie un email de test au destinataire saisi (template{" "}
            <code className="bg-muted text-foreground rounded px-1">password-changed</code>).
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] flex-1 space-y-1">
              <Label htmlFor="to" className="text-foreground">
                Destinataire
              </Label>
              <Input
                id="to"
                name="to"
                type="email"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                }}
                placeholder="vous@s2m.ma"
              />
            </div>
            <Button onClick={onTest} disabled={pending || to.length === 0}>
              {pending ? "Envoi..." : "Envoyer le test"}
            </Button>
          </div>
          {result !== null && (
            <p className="mt-3 text-sm text-emerald-300">
              Email {result.delivered ? "envoyé" : "non envoyé"} en mode {result.mode}.
            </p>
          )}
          {error.length > 0 && <p className="text-destructive mt-3 text-sm">{error}</p>}
        </section>
      )}
    </div>
  );
}

/** Phase 17 U4 — affiche la valeur SMTP réelle, ou la valeur par défaut
 *  documentée dans `.env.example` grisée en italique si non définie. */
function SmtpField({
  value,
  placeholder,
}: {
  readonly value: string | number | null;
  readonly placeholder: string;
}): React.JSX.Element {
  if (value !== null && value !== "") {
    return <dd className="text-foreground font-mono">{value}</dd>;
  }
  return <dd className="text-muted-foreground font-mono italic">{placeholder}</dd>;
}
