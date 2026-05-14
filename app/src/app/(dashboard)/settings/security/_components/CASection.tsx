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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  backfillClientCertsAction,
  deleteCAAction,
  downloadCACertAction,
  generateCAAction,
  getHealthcheckSharedKeyAction,
  importCAAction,
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
  // Phase 24 — dialogs import / delete CA.
  const [importDialogOpen, setImportDialogOpen] = useState<boolean>(false);
  const [importPrivateKey, setImportPrivateKey] = useState<string>("");
  const [importCert, setImportCert] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string>("");

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

  function handleImport(): void {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const r = await importCAAction({
            privateKeyPem: importPrivateKey,
            certificatePem: importCert,
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
          setImportDialogOpen(false);
          setImportPrivateKey("");
          setImportCert("");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
      })();
    });
  }

  function handleDelete(): void {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const r = await deleteCAAction();
          if (!r.success) {
            setError(r.error);
            return;
          }
          setStatus({ exists: false, expiresAt: null, subjectCN: null, generatedAt: null });
          setBackfillStatus({ pendingCount: r.data.clientsAffected });
          setDeleteDialogOpen(false);
          setDeleteConfirm("");
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
    <section className="border-border bg-card rounded-lg border p-6 shadow-sm">
      <h2 className="text-foreground text-lg font-semibold">{t("ca.title")}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{t("ca.description")}</p>

      {status.exists ? (
        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground font-medium">{t("ca.statusLabel")}</dt>
            <dd className="text-green-700">{t("ca.statusActive")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">{t("ca.subjectLabel")}</dt>
            <dd>{status.subjectCN}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">{t("ca.generatedAtLabel")}</dt>
            <dd>
              {status.generatedAt !== null
                ? new Date(status.generatedAt).toLocaleString("fr-FR")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground font-medium">{t("ca.expiresAtLabel")}</dt>
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
        <Button
          variant="outline"
          onClick={() => {
            setError(null);
            setImportDialogOpen(true);
          }}
          disabled={status.exists || isPending}
        >
          Importer CA
        </Button>
        <Button variant="outline" onClick={handleDownload} disabled={!status.exists || isPending}>
          {t("ca.download")}
        </Button>
        {/* Phase 24 — suppression CA (SADMIN, garde-fou .lic côté serveur). */}
        <Button
          variant="destructive"
          onClick={() => {
            setError(null);
            setDeleteConfirm("");
            setDeleteDialogOpen(true);
          }}
          disabled={!status.exists || isPending}
        >
          Supprimer CA
        </Button>
      </div>

      {status.exists && (
        <p className="text-muted-foreground mt-4 text-xs">{t("ca.regenWarning")}</p>
      )}

      {error !== null && (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Phase 3.G — Toggle endpoint public CA */}
      {status.exists && (
        <div className="border-border mt-8 border-t pt-6">
          <h3 className="text-foreground text-base font-semibold">{t("expose.title")}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{t("expose.description")}</p>
          <label className="mt-3 inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={exposeCaPublic}
              onChange={handleToggleExposePublic}
              disabled={isPending}
              className="border-border h-4 w-4 rounded"
            />
            <span className="text-foreground text-sm">
              {exposeCaPublic ? t("expose.toggleActive") : t("expose.toggleInactive")}
            </span>
          </label>
        </div>
      )}

      {/* Phase 3.E + Phase 22 R-50 — Backfill clients sans certificat */}
      {status.exists && (
        <div className="border-border mt-8 border-t pt-6">
          <h3 className="text-foreground text-base font-semibold">{t("backfill.title")}</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Le backfill génère un certificat PKI X.509 pour chaque client qui n&apos;en a pas
            encore. Ce certificat est nécessaire pour signer les fichiers <code>.lic</code> envoyés
            aux clients (format F2). La clé privée est chiffrée AES-256-GCM avec{" "}
            <code>APP_MASTER_KEY</code> et stockée de manière sécurisée. Durée estimée : ~2s par
            client.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
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
      <div className="border-border mt-8 border-t pt-6">
        <h3 className="text-foreground text-base font-semibold">Clé AES-256 healthcheck</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Clé symétrique partagée entre S2M et la banque cliente pour chiffrer les fichiers
          <code className="mx-1">.hc</code>
          (healthcheck) avant envoi. Transmettre par canal sécurisé (1 fois à l&apos;intégration).
        </p>
        {healthcheckKeyVisible && healthcheckKey !== null ? (
          <div className="mt-3 space-y-2">
            <div className="bg-muted border-border break-all rounded border p-2 font-mono text-xs">
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

      {/* Phase 24 — Dialog Import CA (2 textareas PEM). */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importer une CA existante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Importe une CA existante en collant la clé privée et le certificat au format PEM. La
              cohérence clé/cert est vérifiée serveur avant persistance ; la clé privée est chiffrée
              AES-256-GCM avec <code>APP_MASTER_KEY</code>.
            </p>
            <details className="text-muted-foreground rounded border border-dashed p-2 text-xs">
              <summary className="cursor-pointer font-medium">Fichier .p12 / PKCS#12 ?</summary>
              <p className="mt-2">
                Le format PKCS#12 n&apos;est pas supporté nativement par node:crypto (et les
                dépendances crypto tierces sont interdites par ADR 0019). Convertir d&apos;abord via
                openssl CLI :
              </p>
              <pre className="bg-muted mt-2 rounded p-2 font-mono text-[11px]">
                openssl pkcs12 -in ca.p12 -nocerts -nodes -out ca-key.pem{"\n"}
                openssl pkcs12 -in ca.p12 -clcerts -nokeys -out ca-cert.pem
              </pre>
            </details>
            <div className="space-y-1">
              <Label htmlFor="ca-import-key">Clé privée PEM</Label>
              <textarea
                id="ca-import-key"
                value={importPrivateKey}
                onChange={(e) => {
                  setImportPrivateKey(e.target.value);
                }}
                placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                className="border-input bg-background h-40 w-full rounded-md border p-2 font-mono text-xs"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ca-import-cert">Certificat PEM</Label>
              <textarea
                id="ca-import-cert"
                value={importCert}
                onChange={(e) => {
                  setImportCert(e.target.value);
                }}
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                className="border-input bg-background h-40 w-full rounded-md border p-2 font-mono text-xs"
                spellCheck={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
              }}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={
                isPending || importPrivateKey.trim().length === 0 || importCert.trim().length === 0
              }
            >
              {isPending ? "Import en cours…" : "Importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase 24 — Dialog confirmation Supprimer CA. */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Supprimer la CA S2M</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Cette action est <strong>destructive</strong> et irréversible : la CA sera supprimée
              de <code>lic_settings</code> et les 3 colonnes PKI (
              <code>client_private_key_enc</code>, <code>client_certificate_pem</code>,
              <code>client_certificate_expires_at</code>) seront nullifiées sur tous les clients.
            </p>
            <p>
              La suppression est <strong>bloquée côté serveur</strong> si au moins un fichier{" "}
              <code>.lic</code> a déjà été généré (SPX-LIC-412) — la traçabilité des artefacts
              livrés serait compromise.
            </p>
            <div className="space-y-1">
              <Label htmlFor="ca-delete-confirm">
                Saisir <span className="font-mono">SUPPRIMER</span> pour confirmer
              </Label>
              <input
                id="ca-delete-confirm"
                type="text"
                value={deleteConfirm}
                onChange={(e) => {
                  setDeleteConfirm(e.target.value);
                }}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
              }}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending || deleteConfirm !== "SUPPRIMER"}
            >
              {isPending ? "Suppression en cours…" : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
