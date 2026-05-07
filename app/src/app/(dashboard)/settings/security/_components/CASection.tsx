"use client";

// ==============================================================================
// LIC v2 — UI section CA S2M (Phase 3.C, i18n Phase 16 — DETTE-LIC-015)
//
// Affiche le statut de la CA + bouton "Générer la CA" (SADMIN, désactivé si
// CA déjà présente) + bouton "Télécharger s2m-ca.pem" (si CA présente).
// ==============================================================================

import { useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import {
  backfillClientCertsAction,
  downloadCACertAction,
  generateCAAction,
  getHealthcheckSharedKeyAction,
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
  const t = useTranslations("settings.security");
  const [status, setStatus] = useState<CAStatusActionOutput>(initialStatus);
  const [backfillStatus, setBackfillStatus] = useState<BackfillStatusOutput>(initialBackfillStatus);
  const [backfillResult, setBackfillResult] = useState<{
    processed: number;
    failed: number;
  } | null>(null);
  const [exposeCaPublic, setExposeCaPublic] = useState<boolean>(initialExposeCaPublic);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Phase 23 — clé AES-256 partagée healthcheck (à transmettre à la banque
  // par canal sécurisé pour chiffrer les .hc côté client).
  const [healthcheckKey, setHealthcheckKey] = useState<string | null>(null);
  const [healthcheckKeyVisible, setHealthcheckKeyVisible] = useState<boolean>(false);

  function handleRevealHealthcheckKey(): void {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const r = await getHealthcheckSharedKeyAction();
          if (!r.success) {
            setError(r.error);
            return;
          }
          setHealthcheckKey(r.data);
          setHealthcheckKeyVisible(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  }

  function handleToggleExposePublic(): void {
    setError(null);
    const next = !exposeCaPublic;
    startTransition(() => {
      void (async () => {
        try {
          const r = await setExposeS2mCaPublicAction(next);
          if (!r.success) {
            setError(r.error);
            return;
          }
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
          if (!r.success) {
            setError(r.error);
            return;
          }
          setBackfillResult({ processed: r.data.processed, failed: r.data.failed });
          setBackfillStatus({ pendingCount: r.data.failed });
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
          const r = await generateCAAction({
            subjectCN: "S2M Root CA",
            org: "S2M",
          });
          if (!r.success) {
            setError(r.error);
            return;
          }
          setStatus({
            exists: true,
            expiresAt: r.data.expiresAt,
            subjectCN: r.data.subjectCN,
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
      <h2 className="text-spx-ink text-lg font-semibold">{t("ca.title")}</h2>
      <p className="text-spx-ink/70 mt-1 text-sm">{t("ca.description")}</p>

      {status.exists ? (
        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-spx-ink/60 font-medium">{t("ca.statusLabel")}</dt>
            <dd className="text-green-700">{t("ca.statusActive")}</dd>
          </div>
          <div>
            <dt className="text-spx-ink/60 font-medium">{t("ca.subjectLabel")}</dt>
            <dd>{status.subjectCN}</dd>
          </div>
          <div>
            <dt className="text-spx-ink/60 font-medium">{t("ca.generatedAtLabel")}</dt>
            <dd>
              {status.generatedAt !== null
                ? new Date(status.generatedAt).toLocaleString("fr-FR")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-spx-ink/60 font-medium">{t("ca.expiresAtLabel")}</dt>
            <dd>
              {status.expiresAt !== null ? new Date(status.expiresAt).toLocaleString("fr-FR") : "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm font-medium text-orange-700">{t("ca.warningMissing")}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={handleGenerate} disabled={status.exists || isPending}>
          {isPending ? t("ca.generating") : t("ca.generate")}
        </Button>
        <Button variant="outline" onClick={handleDownload} disabled={!status.exists || isPending}>
          {t("ca.download")}
        </Button>
      </div>

      {status.exists && <p className="text-spx-ink/60 mt-4 text-xs">{t("ca.regenWarning")}</p>}

      {error !== null && (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Phase 3.G — Toggle endpoint public CA */}
      {status.exists && (
        <div className="border-spx-ink/10 mt-8 border-t pt-6">
          <h3 className="text-spx-ink text-base font-semibold">{t("expose.title")}</h3>
          <p className="text-spx-ink/70 mt-1 text-sm">{t("expose.description")}</p>
          <label className="mt-3 inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={exposeCaPublic}
              onChange={handleToggleExposePublic}
              disabled={isPending}
              className="border-spx-ink/30 h-4 w-4 rounded"
            />
            <span className="text-spx-ink text-sm">
              {exposeCaPublic ? t("expose.toggleActive") : t("expose.toggleInactive")}
            </span>
          </label>
        </div>
      )}

      {/* Phase 3.E + Phase 22 R-50 — Backfill clients sans certificat */}
      {status.exists && (
        <div className="border-spx-ink/10 mt-8 border-t pt-6">
          <h3 className="text-spx-ink text-base font-semibold">{t("backfill.title")}</h3>
          <p className="text-spx-ink/70 mt-1 text-sm">
            Le backfill génère un certificat PKI X.509 pour chaque client qui n&apos;en a pas
            encore. Ce certificat est nécessaire pour signer les fichiers <code>.lic</code> envoyés
            aux clients (format F2). La clé privée est chiffrée AES-256-GCM avec{" "}
            <code>APP_MASTER_KEY</code> et stockée de manière sécurisée. Durée estimée : ~2s par
            client.
          </p>
          <p className="text-spx-ink/70 mt-2 text-sm">
            {backfillStatus.pendingCount === 0
              ? t("backfill.allOk")
              : t("backfill.pending", { count: backfillStatus.pendingCount })}
          </p>
          <Button
            className="mt-3"
            onClick={handleBackfill}
            disabled={backfillStatus.pendingCount === 0 || isPending}
          >
            {isPending ? t("backfill.running") : t("backfill.run")}
          </Button>
          {backfillResult !== null && (
            <p className="mt-3 text-sm text-green-700">
              {backfillResult.failed > 0
                ? t("backfill.doneWithFailed", {
                    processed: backfillResult.processed,
                    failed: backfillResult.failed,
                  })
                : t("backfill.done", { processed: backfillResult.processed })}
            </p>
          )}
        </div>
      )}

      {/* Phase 23 — clé AES-256 partagée healthcheck (transmise aux banques
           pour chiffrer les .hc avant envoi). Affichage masqué par défaut,
           bouton "Afficher" pour révéler à la demande SADMIN. */}
      <div className="border-spx-ink/10 mt-8 border-t pt-6">
        <h3 className="text-spx-ink text-base font-semibold">Clé AES-256 healthcheck</h3>
        <p className="text-spx-ink/70 mt-1 text-sm">
          Clé symétrique partagée entre S2M et la banque cliente pour chiffrer les fichiers
          <code className="mx-1">.hc</code>
          (healthcheck) avant envoi. Transmettre par canal sécurisé (1 fois à l&apos;intégration).
        </p>
        {healthcheckKeyVisible && healthcheckKey !== null ? (
          <div className="mt-3 space-y-2">
            <div className="bg-spx-ink/5 border-spx-ink/10 break-all rounded border p-2 font-mono text-xs">
              {healthcheckKey.length > 0 ? healthcheckKey : "(non générée — relancer pnpm db:seed)"}
            </div>
            {healthcheckKey.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(healthcheckKey);
                  }}
                >
                  Copier
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setHealthcheckKeyVisible(false);
                  }}
                >
                  Masquer
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Button className="mt-3" variant="outline" onClick={handleRevealHealthcheckKey}>
            Afficher la clé
          </Button>
        )}
      </div>
    </section>
  );
}
