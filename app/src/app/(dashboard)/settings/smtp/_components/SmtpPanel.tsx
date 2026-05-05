// ==============================================================================
// LIC v2 — /settings/smtp — Panel client (Phase 14)
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
      <section className="border-spx-ink/10 rounded-lg border bg-white p-4">
        <h2 className="text-spx-ink text-sm font-semibold">État de la configuration</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <dt className="text-spx-ink/60">Mode</dt>
          <dd>
            {isSimulated ? (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                Simulé (console)
              </span>
            ) : (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-900">SMTP</span>
            )}
          </dd>
          <dt className="text-spx-ink/60">Hôte</dt>
          <dd className="font-mono">{status.host ?? "—"}</dd>
          <dt className="text-spx-ink/60">Port</dt>
          <dd className="font-mono">{status.port ?? "—"}</dd>
          <dt className="text-spx-ink/60">From</dt>
          <dd className="font-mono">{status.from ?? "—"}</dd>
        </dl>
        {isSimulated && (
          <p className="text-spx-ink/70 mt-3 text-xs">
            Aucun email réel n&apos;est envoyé. Définir{" "}
            <code className="bg-muted rounded px-1">SMTP_HOST</code> dans{" "}
            <code className="bg-muted rounded px-1">.env</code> pour activer le mode SMTP.
          </p>
        )}
      </section>

      {canTest && (
        <section className="border-spx-ink/10 rounded-lg border bg-white p-4">
          <h2 className="text-spx-ink text-sm font-semibold">Tester l&apos;envoi</h2>
          <p className="text-spx-ink/70 mt-1 text-xs">
            Envoie un email de test au destinataire saisi (template{" "}
            <code className="bg-muted rounded px-1">password-changed</code>).
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[280px] flex-1 space-y-1">
              <Label htmlFor="to">Destinataire</Label>
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
            <p className="mt-3 text-sm text-green-700">
              Email {result.delivered ? "envoyé" : "non envoyé"} en mode {result.mode}.
            </p>
          )}
          {error.length > 0 && <p className="text-destructive mt-3 text-sm">{error}</p>}
        </section>
      )}
    </div>
  );
}
