// ==============================================================================
// LIC v2 — LicencesTab (Phase 5.E + Phase 22 R-46 wizard)
//
// Tableau licences du client + bouton « Nouvelle licence » qui ouvre le wizard
// 3 étapes (NewLicenceDialog — Phase 21 R-30) avec `lockedClientId` pour
// pré-sélectionner le client courant en étape 1 (read-only).
//
// Le Dialog inline Phase 5 a été retiré : le wizard centralise la création
// (catalogue produits/articles, check doublon, ajout articles robuste). Le
// catalogue est fourni par le Server Component parent (cf. licences/page.tsx
// /clients/[id]/licences/page.tsx).
// ==============================================================================

"use client";

import Link from "next/link";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  NewLicenceDialog,
  type ArticleOption,
  type ClientOption,
  type ProduitOption,
} from "@/app/(dashboard)/licences/_components/NewLicenceDialog";

import type { EntiteDTO } from "./clients-detail-types";
import { LicenceStatusBadge } from "./LicenceStatusBadge";
import type { LicenceDTO } from "./licence-types";

export interface LicencesTabProps {
  readonly clientId: string;
  readonly entites: readonly EntiteDTO[];
  readonly licences: readonly LicenceDTO[];
  readonly canEdit: boolean;
  /** Phase 22 R-46 — props wizard 3 étapes. */
  readonly wizardClients: readonly ClientOption[];
  readonly wizardProduits: readonly ProduitOption[];
  readonly wizardArticles: readonly ArticleOption[];
}

export function LicencesTab(props: LicencesTabProps) {
  const t = useTranslations("clients.detail.licencesTab");

  // Map entiteId → nom pour affichage en table sans round-trip serveur.
  const entiteNomById = new Map<string, string>();
  for (const e of props.entites) entiteNomById.set(e.id, e.nom);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-foreground text-lg">{t("section")}</h2>
        {props.canEdit && props.entites.length > 0 && (
          <NewLicenceDialog
            clients={props.wizardClients}
            produits={props.wizardProduits}
            articles={props.wizardArticles}
            lockedClientId={props.clientId}
            triggerLabel={t("newLicence")}
          />
        )}
      </div>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.reference")}</TableHead>
            <TableHead>{t("table.entite")}</TableHead>
            <TableHead>{t("table.status")}</TableHead>
            <TableHead>{t("table.dateDebut")}</TableHead>
            <TableHead>{t("table.dateFin")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.licences.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground text-center text-sm">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            props.licences.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.reference}</TableCell>
                <TableCell>{entiteNomById.get(l.entiteId) ?? "—"}</TableCell>
                <TableCell>
                  <LicenceStatusBadge status={l.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {l.dateDebut.slice(0, 10)}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {l.dateFin.slice(0, 10)}
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href={`/licences/${l.id}`}>{t("viewDetail")}</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}
