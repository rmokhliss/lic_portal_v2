// ==============================================================================
// LIC v2 — ClientInfoTab (Phase 4 étape 4.F)
//
// Client Component : affiche les infos client en grille label/valeur, plus
// 2 boutons (Modifier infos / Changer statut) — visibles si canEdit
// (ADMIN/SADMIN). « Modifier infos » ouvre ClientDialog (réutilisé depuis
// 4.E). « Changer statut » ouvre un mini-Dialog dédié.
// ==============================================================================

"use client";

import { useMemo, useState, useTransition } from "react";

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

import { changeClientStatusAction } from "../../_actions";
import { ClientDialog, type RefItem } from "../../_components/ClientDialog";
import { ClientStatusBadge } from "../../_components/ClientStatusBadge";
import type { ClientDTO, ClientStatutClient } from "../../_components/clients-types";

const STATUTS: readonly ClientStatutClient[] = ["PROSPECT", "ACTIF", "SUSPENDU", "RESILIE"];

export interface ClientInfoTabProps {
  readonly client: ClientDTO;
  readonly canEdit: boolean;
  /** T-01 : référentiels SADMIN propagés au ClientDialog. */
  readonly paysList: readonly RefItem[];
  readonly devisesList: readonly RefItem[];
  readonly languesList: readonly RefItem[];
  /** T-01 Volet A : team-members SALES / AM. */
  readonly salesList: readonly RefItem[];
  readonly amList: readonly RefItem[];
}

type DialogState = { kind: "none" } | { kind: "edit" } | { kind: "status" };

export function ClientInfoTab({
  client,
  canEdit,
  paysList,
  devisesList,
  languesList,
  salesList,
  amList,
}: ClientInfoTabProps) {
  const t = useTranslations("clients.detail.info");
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  // Phase 20 R-27 — résolution code → libellé via les référentiels passés en
  // props par le Server Component parent (déjà fetchés pour ClientDialog).
  // Affichage 'Maroc' au lieu de 'MA', 'Dollar australien (AUD)' au lieu de
  // 'AUD'. Fallback sur le code brut si lookup raté (résilience aux données
  // legacy non-cleanup).
  const paysByCode = useMemo(() => new Map(paysList.map((p) => [p.code, p.label])), [paysList]);
  const deviseByCode = useMemo(
    () => new Map(devisesList.map((d) => [d.code, d.label])),
    [devisesList],
  );
  const langueByCode = useMemo(
    () => new Map(languesList.map((l) => [l.code, l.label])),
    [languesList],
  );

  const renderPays = (code: string | null): string => {
    if (code === null) return "—";
    const label = paysByCode.get(code);
    return label !== undefined ? `${label} (${code})` : code;
  };
  const renderDevise = (code: string | null): string => {
    if (code === null) return "—";
    const label = deviseByCode.get(code);
    return label !== undefined ? `${label} (${code})` : code;
  };
  const renderLangue = (code: string | null): string => {
    if (code === null) return "—";
    const label = langueByCode.get(code);
    return label !== undefined ? `${label} (${code})` : code;
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-foreground text-lg">{t("section")}</h2>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialog({ kind: "edit" });
              }}
            >
              {t("editInfo")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setDialog({ kind: "status" });
              }}
            >
              {t("changeStatus")}
            </Button>
          </div>
        )}
      </div>

      <dl className="border-border divide-border mt-4 grid grid-cols-1 divide-y rounded-md border md:grid-cols-2 md:gap-x-8 md:divide-y-0">
        <Row
          label={t("fields.codeClient")}
          value={<span className="font-mono">{client.codeClient}</span>}
        />
        <Row label={t("fields.raisonSociale")} value={client.raisonSociale} />
        <Row
          label={t("fields.statutClient")}
          value={<ClientStatusBadge statut={client.statutClient} />}
        />
        <Row label={t("fields.actif")} value={client.actif ? "✓" : "—"} />
        <Row label={t("fields.codePays")} value={renderPays(client.codePays)} />
        <Row label={t("fields.codeDevise")} value={renderDevise(client.codeDevise)} />
        <Row label={t("fields.codeLangue")} value={renderLangue(client.codeLangue)} />
        <Row label={t("fields.salesResponsable")} value={client.salesResponsable ?? "—"} />
        <Row label={t("fields.accountManager")} value={client.accountManager ?? "—"} />
        <Row label={t("fields.nomContact")} value={client.nomContact ?? "—"} />
        <Row label={t("fields.emailContact")} value={client.emailContact ?? "—"} />
        <Row label={t("fields.telContact")} value={client.telContact ?? "—"} />
        <Row label={t("fields.dateSignatureContrat")} value={client.dateSignatureContrat ?? "—"} />
        <Row label={t("fields.dateMiseEnProd")} value={client.dateMiseEnProd ?? "—"} />
        <Row label={t("fields.dateDemarrageSupport")} value={client.dateDemarrageSupport ?? "—"} />
        <Row
          label={t("fields.prochaineDateRenouvellementSupport")}
          value={client.prochaineDateRenouvellementSupport ?? "—"}
        />
        <Row label={t("fields.dateCreation")} value={client.dateCreation.slice(0, 10)} />
        <Row label={t("fields.version")} value={String(client.version)} />
      </dl>

      {/* Dialog Modifier infos — réutilise ClientDialog (4.E) en mode edit */}
      <ClientDialog
        open={dialog.kind === "edit"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "none" });
        }}
        mode="edit"
        client={client}
        paysList={paysList}
        devisesList={devisesList}
        languesList={languesList}
        salesList={salesList}
        amList={amList}
      />

      {/* Dialog Changer statut */}
      <ChangeStatusDialog
        open={dialog.kind === "status"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "none" });
        }}
        client={client}
      />
    </>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 items-center gap-2 px-4 py-2.5">
      <dt className="text-muted-foreground text-xs uppercase tracking-wider">{label}</dt>
      <dd className="text-foreground text-sm">{value}</dd>
    </div>
  );
}

function ChangeStatusDialog({
  open,
  onOpenChange,
  client,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly client: ClientDTO;
}) {
  const t = useTranslations("clients.detail.info.statusDialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const [newStatus, setNewStatus] = useState<ClientStatutClient>(client.statutClient);

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newStatus === client.statutClient) {
      onOpenChange(false);
      return;
    }
    startTransition(() => {
      void (async () => {
        // Phase 23 R-45 — lecture du Result tagué.
        try {
          const r = await changeClientStatusAction({
            clientId: client.id,
            expectedVersion: client.version,
            newStatus,
          });
          if (r.success) {
            setError("");
            onOpenChange(false);
          } else {
            setError(r.error);
          }
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
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="newStatus">{t("newStatus")}</Label>
            <select
              id="newStatus"
              value={newStatus}
              onChange={(e) => {
                setNewStatus(e.target.value as ClientStatutClient);
              }}
              className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
            >
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
