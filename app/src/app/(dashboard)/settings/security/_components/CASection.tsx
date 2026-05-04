"use client";

// ==============================================================================
// LIC v2 — UI section CA S2M (Phase 3.C)
//
// Affiche le statut de la CA + bouton "Générer la CA" (SADMIN, désactivé si
// CA déjà présente) + bouton "Télécharger s2m-ca.pem" (si CA présente).
// ==============================================================================

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  backfillClientCertsAction,
  downloadCACertAction,
  generateCAAction,
  setExposeS2mCaPublicAction,
  type BackfillStatusOutput,
  type CAStatusActionOutput,
} from "../_actions";

export interface CASectionProps {
  initialStatus: CAStatusActionOutput;
  initialBackfillStatus: BackfillStatusOutput;
  initialExposeCaPublic: boolean;
}

export function CASection({
  initialStatus,
  initialBackfillStatus,
  initialExposeCaPublic,
}: CASectionProps): React.JSX.Element {
  const [status, setStatus] = useState<CAStatusActionOutput>(initialStatus);
  const [backfillStatus, setBackfillStatus] = useState<BackfillStatusOutput>(initialBackfillStatus);
  const [backfillResult, setBackfillResult] = useState<{
    processed: number;
    failed: number;
  } | null>(null);
  const [exposeCaPublic, setExposeCaPublic] = useState<boolean>(initialExposeCaPublic);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggleExposePublic(): void {
    setError(null);
    const next = !exposeCaPublic;
    startTransition(() => {
      void (async () => {
        try {
          await setExposeS2mCaPublicAction(next);
          setExposeCaPublic(next);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
      })();
    });
  }

  function handleBackfill(): void {
    setError(null);
    setBackfillResult(null);
    startTransition(() => {
      void (async () => {
        try {
          const r = await backfillClientCertsAction();
          setBackfillResult({ processed: r.processed, failed: r.failed });
          setBackfillStatus({ pendingCount: r.failed });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
      })();
    });
  }

  function handleGenerate(): void {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const result = await generateCAAction({
            subjectCN: "S2M Root CA",
            org: "S2M",
          });
          setStatus({
            exists: true,
            expiresAt: result.expiresAt,
            subjectCN: result.subjectCN,
            generatedAt: new Date().toISOString(),
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
      })();
    });
  }

  function handleDownload(): void {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const pem = await downloadCACertAction();
          const blob = new Blob([pem], { type: "application/x-pem-file" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "s2m-ca.pem";
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
      })();
    });
  }

  return (
    <section className="border-spx-ink/10 rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-spx-ink text-lg font-semibold">Autorité de certification S2M</h2>
      <p className="text-spx-ink/70 mt-1 text-sm">
        La CA S2M signe tous les certificats clients utilisés pour générer les fichiers .lic.
      </p>

      {status.exists ? (
        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-spx-ink/60 font-medium">Statut</dt>
            <dd className="text-green-700">Active</dd>
          </div>
          <div>
            <dt className="text-spx-ink/60 font-medium">Sujet</dt>
            <dd>{status.subjectCN}</dd>
          </div>
          <div>
            <dt className="text-spx-ink/60 font-medium">Générée le</dt>
            <dd>
              {status.generatedAt !== null
                ? new Date(status.generatedAt).toLocaleString("fr-FR")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-spx-ink/60 font-medium">Expire le</dt>
            <dd>
              {status.expiresAt !== null ? new Date(status.expiresAt).toLocaleString("fr-FR") : "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm font-medium text-orange-700">
          ⚠ La CA S2M n&apos;est pas générée. Elle est requise pour créer des clients avec leur
          certificat.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={handleGenerate} disabled={status.exists || isPending}>
          {isPending ? "Génération…" : "Générer la CA"}
        </Button>
        <Button variant="outline" onClick={handleDownload} disabled={!status.exists || isPending}>
          Télécharger s2m-ca.pem
        </Button>
      </div>

      {status.exists && (
        <p className="text-spx-ink/60 mt-4 text-xs">
          ⚠ Régénérer la CA invaliderait tous les certificats clients existants. Opération non
          supportée Phase 3 — contacter l&apos;équipe Référentiel S2M.
        </p>
      )}

      {error !== null && (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Phase 3.G — Toggle endpoint public CA */}
      {status.exists && (
        <div className="border-spx-ink/10 mt-8 border-t pt-6">
          <h3 className="text-spx-ink text-base font-semibold">Endpoint public CA</h3>
          <p className="text-spx-ink/70 mt-1 text-sm">
            Active la route <code className="font-mono">/.well-known/s2m-ca.pem</code> pour
            permettre aux clients S2M de récupérer la clé publique CA. Désactivé : 404.
          </p>
          <label className="mt-3 inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={exposeCaPublic}
              onChange={handleToggleExposePublic}
              disabled={isPending}
              className="border-spx-ink/30 h-4 w-4 rounded"
            />
            <span className="text-spx-ink text-sm">
              Exposer publiquement {exposeCaPublic ? "(actif)" : "(désactivé)"}
            </span>
          </label>
        </div>
      )}

      {/* Phase 3.E — Backfill clients sans certificat */}
      {status.exists && (
        <div className="border-spx-ink/10 mt-8 border-t pt-6">
          <h3 className="text-spx-ink text-base font-semibold">Backfill certificats clients</h3>
          <p className="text-spx-ink/70 mt-1 text-sm">
            {backfillStatus.pendingCount === 0
              ? "Tous les clients ont un certificat. Aucune action requise."
              : `${String(backfillStatus.pendingCount)} client(s) sans certificat — génération différée.`}
          </p>
          <Button
            className="mt-3"
            onClick={handleBackfill}
            disabled={backfillStatus.pendingCount === 0 || isPending}
          >
            {isPending ? "Backfill en cours…" : "Lancer le backfill"}
          </Button>
          {backfillResult !== null && (
            <p className="mt-3 text-sm text-green-700">
              Backfill terminé : {backfillResult.processed} certifié(s)
              {backfillResult.failed > 0 && `, ${String(backfillResult.failed)} en échec`}.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
