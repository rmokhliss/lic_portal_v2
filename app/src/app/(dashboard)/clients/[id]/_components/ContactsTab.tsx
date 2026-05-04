// ==============================================================================
// LIC v2 — ContactsTab (Phase 4 étape 4.F)
//
// Sélecteur d'entité (si plusieurs) + table contacts + Dialog create/edit/delete.
// L'entité courante est passée en searchParam ?entiteId= → re-render serveur.
//
// Suppression hard delete (use-case 4.C). Confirmation native (window.confirm)
// pour rester dans le scope (pas d'AlertDialog shadcn — pattern Phase 2.B.bis).
// ==============================================================================

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

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

import { deleteContactAction } from "../_actions";
import { ContactDialog } from "./ContactDialog";
import type { ContactDTO, EntiteDTO } from "./clients-detail-types";

// Bootstrap référentiel types_contact_ref (3 valeurs initiales). Pour la
// liste complète dynamique, le SADMIN administre via /settings/team. Ici on
// expose une liste statique minimale + on accepte la saisie libre côté serveur.
const TYPES_CONTACT_OPTIONS: readonly string[] = [
  "ACHAT",
  "FACTURATION",
  "TECHNIQUE",
  "JURIDIQUE",
  "TECHNIQUE_F2",
  "DIRECTION",
];

export interface ContactsTabProps {
  readonly clientId: string;
  readonly entites: readonly EntiteDTO[];
  readonly selectedEntiteId: string | null;
  readonly contacts: readonly ContactDTO[];
  readonly canEdit: boolean;
}

type DialogState = { kind: "none" } | { kind: "create" } | { kind: "edit"; contact: ContactDTO };

export function ContactsTab(props: ContactsTabProps) {
  const t = useTranslations("clients.detail.contacts");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  const onChangeEntite = (entiteId: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("entiteId", entiteId);
    router.push(`/clients/${props.clientId}/contacts?${sp.toString()}`);
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-display text-foreground text-lg">{t("section")}</h2>
          {props.entites.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="entiteSelect"
                className="text-muted-foreground text-xs uppercase tracking-wider"
              >
                {t("selectEntite")}
              </label>
              <select
                id="entiteSelect"
                value={props.selectedEntiteId ?? ""}
                onChange={(e) => {
                  onChangeEntite(e.target.value);
                }}
                className="border-input bg-background text-foreground h-8 rounded-md border px-2 text-sm"
              >
                {props.entites.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {props.canEdit && props.selectedEntiteId !== null && (
          <Button
            type="button"
            onClick={() => {
              setDialog({ kind: "create" });
            }}
          >
            {t("newContact")}
          </Button>
        )}
      </div>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.type")}</TableHead>
            <TableHead>{t("table.nom")}</TableHead>
            <TableHead>{t("table.email")}</TableHead>
            <TableHead>{t("table.telephone")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            props.contacts.map((c) => (
              <ContactRow
                key={c.id}
                contact={c}
                clientId={props.clientId}
                canEdit={props.canEdit}
                onEdit={() => {
                  setDialog({ kind: "edit", contact: c });
                }}
              />
            ))
          )}
        </TableBody>
      </Table>

      {props.selectedEntiteId !== null && (
        <ContactDialog
          open={dialog.kind === "create" || dialog.kind === "edit"}
          onOpenChange={(open) => {
            if (!open) setDialog({ kind: "none" });
          }}
          clientId={props.clientId}
          entiteId={props.selectedEntiteId}
          typesContactOptions={TYPES_CONTACT_OPTIONS}
          mode={dialog.kind === "edit" ? "edit" : "create"}
          contact={dialog.kind === "edit" ? dialog.contact : undefined}
        />
      )}
    </>
  );
}

function ContactRow({
  contact,
  clientId,
  canEdit,
  onEdit,
}: {
  readonly contact: ContactDTO;
  readonly clientId: string;
  readonly canEdit: boolean;
  readonly onEdit: () => void;
}) {
  const t = useTranslations("clients.detail.contacts");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onDelete = () => {
    if (!window.confirm(t("deleteConfirm"))) return;
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          await deleteContactAction({ contactId: contact.id }, { clientId });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{contact.typeContactCode}</TableCell>
      <TableCell>
        {contact.prenom !== null ? `${contact.prenom} ` : ""}
        {contact.nom}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">{contact.email ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground text-xs">{contact.telephone ?? "—"}</TableCell>
      <TableCell className="text-right">
        {canEdit && (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              {t("edit")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={onDelete}
            >
              {t("delete")}
            </Button>
          </div>
        )}
        {error !== "" && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </TableCell>
    </TableRow>
  );
}
