// ==============================================================================
// LIC v2 — ClientDialog (Phase 4 étape 4.E)
//
// Client Component partagé create / edit (pattern UserDialog 2.B.bis).
// useTransition pour bouton désactivé pendant la requête.
//
// Différences mode :
//   - create : champ codeClient visible (saisi ADMIN+, pattern UPPER)
//             + champ siegeNom optionnel (default = raisonSociale)
//   - edit   : codeClient absent (immuable post-création), inclut
//             expectedVersion (optimistic locking — règle L4 SPX-LIC-728)
// ==============================================================================

"use client";

import { useRef, useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createClientAction, updateClientAction } from "../_actions";

import type { ClientDTO } from "./clients-types";

/** Item référentiel minimal (code + libellé affichage). T-01. */
export interface RefItem {
  readonly code: string;
  readonly label: string;
}

/** Phase 24 — item du référentiel `lic_clients_ref` pour l'autocomplete. */
export interface ClientRefItem {
  readonly codeClient: string;
  readonly raisonSociale: string;
}

export interface ClientDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: "create" | "edit";
  readonly client?: ClientDTO;
  /** T-01 : listes référentiels chargées par le Server Component parent. */
  readonly paysList: readonly RefItem[];
  readonly devisesList: readonly RefItem[];
  readonly languesList: readonly RefItem[];
  /** T-01 Volet A : team-members SALES / AM pour les selects sales/AM. */
  readonly salesList: readonly RefItem[];
  readonly amList: readonly RefItem[];
  /** Phase 14 — DETTE-LIC-017 : types contact pour la section contacts à
   *  création. Si liste vide, la section affiche un message de configuration. */
  readonly typesContactList?: readonly RefItem[];
  /** Phase 24 — référentiel `lic_clients_ref` pour l'autocomplete codeClient.
   *  Vide ou omis = comportement legacy (saisie libre sans suggestions). */
  readonly clientsRefList?: readonly ClientRefItem[];
}

/** Phase 14 — état local d'un contact en cours de saisie. */
interface DraftContact {
  readonly localId: string;
  typeContactCode: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
}

const MAX_CONTACTS_AT_CREATION = 5;

export function ClientDialog({
  open,
  onOpenChange,
  mode,
  client,
  paysList,
  devisesList,
  languesList,
  salesList,
  amList,
  typesContactList = [],
  clientsRefList = [],
}: ClientDialogProps) {
  const t = useTranslations("clients.dialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  // Phase 14 — DETTE-LIC-017 : état local des contacts saisis à la création.
  const [contacts, setContacts] = useState<DraftContact[]>([]);
  // Phase 24 — autocomplete codeClient : ref vers raisonSociale pour
  // pré-remplir quand un code du référentiel est sélectionné/saisi exactement.
  // `raisonSocialeRef` reste un input non-controlé (defaultValue) — on agit
  // sur sa valeur impérativement via la ref pour ne pas perturber la saisie.
  const raisonSocialeRef = useRef<HTMLInputElement>(null);
  const clientsRefByCode = clientsRefList.reduce<Record<string, string>>((acc, c) => {
    acc[c.codeClient.toUpperCase()] = c.raisonSociale;
    return acc;
  }, {});

  const handleCodeClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const upper = e.target.value.toUpperCase();
    const matched = clientsRefByCode[upper];
    const raisonField = raisonSocialeRef.current;
    if (matched !== undefined && raisonField !== null && raisonField.value.trim().length === 0) {
      raisonField.value = matched;
    }
  };

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (mode === "create") {
      const payload: Record<string, unknown> = {
        codeClient: strReq(fd.get("codeClient")).toUpperCase(),
        raisonSociale: strReq(fd.get("raisonSociale")),
      };
      const fields = [
        "nomContact",
        "emailContact",
        "telContact",
        "codePays",
        "codeDevise",
        "codeLangue",
        "salesResponsable",
        "accountManager",
        "siegeNom",
      ] as const;
      for (const f of fields) {
        const v = strOpt(fd.get(f));
        if (v !== undefined) payload[f] = v;
      }
      // Phase 23 — dates contrat & support (4 champs YYYY-MM-DD optionnels).
      const dateFields = [
        "dateSignatureContrat",
        "dateMiseEnProd",
        "dateDemarrageSupport",
        "prochaineDateRenouvellementSupport",
      ] as const;
      for (const f of dateFields) {
        const v = strOpt(fd.get(f));
        if (v !== undefined) payload[f] = v;
      }

      // Phase 14 : payload contacts (filtre lignes incomplètes côté client).
      const validContacts = contacts.filter(
        (c) => c.typeContactCode.length > 0 && c.nom.trim().length > 0,
      );
      if (validContacts.length > 0) {
        payload.contacts = validContacts.map((c) => ({
          typeContactCode: c.typeContactCode,
          nom: c.nom.trim(),
          ...(c.prenom.trim().length > 0 ? { prenom: c.prenom.trim() } : {}),
          ...(c.email.trim().length > 0 ? { email: c.email.trim() } : {}),
          ...(c.telephone.trim().length > 0 ? { telephone: c.telephone.trim() } : {}),
        }));
      }

      startTransition(() => {
        void (async () => {
          // Phase 23 R-45 — lecture du Result tagué (au lieu de try/catch
          // sur throw, qui ne reçoit qu'un message digest sanitisé par Next).
          try {
            const r = await createClientAction(payload);
            if (r.success) {
              setError("");
              onOpenChange(false);
            } else {
              setError(r.error);
            }
          } catch (err) {
            // Erreur système (réseau, BD down) — pas un AppError métier.
            setError(err instanceof Error ? err.message : "Erreur");
          }
        })();
      });
      return;
    }

    // mode === "edit"
    if (!client) {
      setError("Client manquant en mode édition");
      return;
    }
    const patch: Record<string, unknown> = {
      clientId: client.id,
      expectedVersion: client.version,
    };
    const editableFields = [
      "raisonSociale",
      "nomContact",
      "emailContact",
      "telContact",
      "codePays",
      "codeDevise",
      "codeLangue",
      "salesResponsable",
      "accountManager",
    ] as const;
    for (const f of editableFields) {
      const v = strOpt(fd.get(f));
      const current = client[f];
      if (v === undefined && current === null) continue;
      if (v !== current) patch[f] = v ?? "";
    }
    // Phase 23 — dates contrat & support. Comparaison sur YYYY-MM-DD slice
    // pour neutraliser un éventuel suffixe ISO côté client.dateXxx.
    const editableDateFields = [
      "dateSignatureContrat",
      "dateMiseEnProd",
      "dateDemarrageSupport",
      "prochaineDateRenouvellementSupport",
    ] as const;
    for (const f of editableDateFields) {
      const v = strOpt(fd.get(f));
      const current = client[f]?.slice(0, 10) ?? null;
      if (v === undefined && current === null) continue;
      if (v !== current) patch[f] = v ?? "";
    }

    startTransition(() => {
      void (async () => {
        // Phase 23 R-45 — lecture du Result tagué (cf. createClientAction).
        try {
          const r = await updateClientAction(patch);
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
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("createTitle") : t("editTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "create" && (
            <div className="space-y-1">
              <Label htmlFor="codeClient">{t("fields.codeClient")}</Label>
              <Input
                id="codeClient"
                name="codeClient"
                required
                placeholder="BAM"
                pattern="^[A-Z0-9_-]+$"
                maxLength={20}
                className="font-mono uppercase"
                // Phase 24 — datalist sur le référentiel lic_clients_ref.
                // L'utilisateur peut sélectionner une suggestion (le navigateur
                // remplit le champ) OU saisir librement un code inédit.
                list={clientsRefList.length > 0 ? "clients-ref-codes" : undefined}
                autoComplete="off"
                onChange={handleCodeClientChange}
              />
              {clientsRefList.length > 0 && (
                <datalist id="clients-ref-codes">
                  {clientsRefList.map((c) => (
                    <option key={c.codeClient} value={c.codeClient}>
                      {c.raisonSociale}
                    </option>
                  ))}
                </datalist>
              )}
              <p className="text-muted-foreground text-xs">{t("fields.codeClientHint")}</p>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="raisonSociale">{t("fields.raisonSociale")}</Label>
            <Input
              id="raisonSociale"
              name="raisonSociale"
              ref={raisonSocialeRef}
              required
              defaultValue={mode === "edit" ? client?.raisonSociale : ""}
              maxLength={200}
            />
          </div>

          {/* T-01 : <select> peuplés depuis les référentiels SADMIN au lieu
               des <Input> libres. Le SADMIN administre la liste autoritative
               via /settings/team — l'UI client la respecte ici. */}
          <div className="grid grid-cols-2 gap-3">
            <RefSelect
              name="codePays"
              label={t("fields.codePays")}
              items={paysList}
              defaultValue={mode === "edit" ? (client?.codePays ?? "") : ""}
            />
            <RefSelect
              name="codeDevise"
              label={t("fields.codeDevise")}
              items={devisesList}
              defaultValue={mode === "edit" ? (client?.codeDevise ?? "") : ""}
            />
          </div>

          <RefSelect
            name="codeLangue"
            label={t("fields.codeLangue")}
            items={languesList}
            defaultValue={mode === "edit" ? (client?.codeLangue ?? "fr") : "fr"}
          />

          <Field
            name="nomContact"
            label={t("fields.nomContact")}
            defaultValue={mode === "edit" ? (client?.nomContact ?? "") : ""}
            maxLength={100}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              name="emailContact"
              label={t("fields.emailContact")}
              type="email"
              defaultValue={mode === "edit" ? (client?.emailContact ?? "") : ""}
              maxLength={200}
            />
            <Field
              name="telContact"
              label={t("fields.telContact")}
              type="tel"
              defaultValue={mode === "edit" ? (client?.telContact ?? "") : ""}
              maxLength={20}
            />
          </div>

          {/* T-01 Volet A : selects depuis team-members SALES / AM (string libre
               stockée = display "Prénom NOM"). Si la liste est vide (référentiel
               non peuplé) le select n'a que l'option vide — l'admin doit alors
               passer par /settings/team pour ajouter des membres. */}
          <div className="grid grid-cols-2 gap-3">
            <RefSelect
              name="salesResponsable"
              label={t("fields.salesResponsable")}
              items={salesList}
              defaultValue={mode === "edit" ? (client?.salesResponsable ?? "") : ""}
            />
            <RefSelect
              name="accountManager"
              label={t("fields.accountManager")}
              items={amList}
              defaultValue={mode === "edit" ? (client?.accountManager ?? "") : ""}
            />
          </div>

          {/* Phase 23 — dates contrat & support (4 champs YYYY-MM-DD optionnels).
               Visibles en création ET en édition (alimentent les rangées de
               ClientInfoTab). */}
          <div className="border-spx-ink/10 mt-2 rounded-md border p-3">
            <p className="text-spx-ink mb-2 text-sm font-medium">Contrat & support</p>
            <div className="grid grid-cols-2 gap-3">
              <Field
                name="dateSignatureContrat"
                label={t("fields.dateSignatureContrat")}
                type="date"
                defaultValue={
                  mode === "edit" ? (client?.dateSignatureContrat?.slice(0, 10) ?? "") : ""
                }
              />
              <Field
                name="dateMiseEnProd"
                label={t("fields.dateMiseEnProd")}
                type="date"
                defaultValue={mode === "edit" ? (client?.dateMiseEnProd?.slice(0, 10) ?? "") : ""}
              />
              <Field
                name="dateDemarrageSupport"
                label={t("fields.dateDemarrageSupport")}
                type="date"
                defaultValue={
                  mode === "edit" ? (client?.dateDemarrageSupport?.slice(0, 10) ?? "") : ""
                }
              />
              <Field
                name="prochaineDateRenouvellementSupport"
                label={t("fields.prochaineDateRenouvellementSupport")}
                type="date"
                defaultValue={
                  mode === "edit"
                    ? (client?.prochaineDateRenouvellementSupport?.slice(0, 10) ?? "")
                    : ""
                }
              />
            </div>
          </div>

          {mode === "create" && (
            <Field name="siegeNom" label={t("fields.siegeNom")} maxLength={200} />
          )}

          {/* Phase 14 — DETTE-LIC-017 résolue : section contacts à création. */}
          {mode === "create" && (
            <ContactsSection
              contacts={contacts}
              setContacts={setContacts}
              typesContactList={typesContactList}
            />
          )}

          {/* T-01 : section contacts en mode edit — lien vers la page dédiée
               où l'admin gère les contacts groupés par type (ACHAT, FACTURATION,
               TECHNIQUE, etc.). L'embedded edit est différé (DETTE-LIC-017). */}
          {mode === "edit" && client !== undefined && (
            <div className="border-spx-ink/10 bg-spx-ink/5 mt-4 rounded-md border p-3">
              <p className="text-spx-ink text-sm font-medium">Contacts du client</p>
              <p className="text-spx-ink/70 mt-1 text-xs">
                Les contacts (ACHAT, FACTURATION, TECHNIQUE…) se gèrent dans la page dédiée pour
                permettre l&apos;ajout, l&apos;édition et la suppression par type.
              </p>
              <a
                href={`/clients/${client.id}/contacts`}
                className="text-spx-blue-600 mt-2 inline-block text-xs font-medium underline-offset-2 hover:underline"
              >
                Ouvrir la page contacts →
              </a>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? mode === "create"
                  ? t("creating")
                  : t("saving")
                : mode === "create"
                  ? t("submitCreate")
                  : t("submitEdit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  defaultValue,
  maxLength,
  className,
}: {
  readonly name: string;
  readonly label: string;
  readonly type?: string;
  readonly required?: boolean;
  readonly defaultValue?: string;
  readonly maxLength?: number;
  readonly className?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        maxLength={maxLength}
        className={className}
      />
    </div>
  );
}

/** T-01 : <select> peuplé par référentiel (paysList, devisesList, languesList,
 *  salesList, amList). Première option vide = "non spécifié" (FK nullable ou
 *  string libre). Si `defaultValue` n'est pas dans `items` (cas legacy d'un
 *  client édité dont la valeur a été retirée du référentiel), on l'ajoute en
 *  tête comme option grisée pour ne pas effacer silencieusement la donnée. */
function RefSelect({
  name,
  label,
  items,
  defaultValue,
}: {
  readonly name: string;
  readonly label: string;
  readonly items: readonly RefItem[];
  readonly defaultValue?: string;
}) {
  const dv = defaultValue ?? "";
  const inItems = dv === "" || items.some((it) => it.code === dv);
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={dv}
        className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
      >
        <option value="">—</option>
        {!inItems && <option value={dv}>{dv} (existant — hors référentiel)</option>}
        {items.map((item) => (
          <option key={item.code} value={item.code}>
            {item.code === item.label ? item.label : `${item.code} — ${item.label}`}
          </option>
        ))}
      </select>
    </div>
  );
}

function strReq(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function strOpt(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length === 0 ? undefined : s;
}

/** Phase 14 — DETTE-LIC-017 : saisie de contacts groupés à la création client.
 *  Tous les contacts sont attachés à l'entité Siège (créée dans la même tx).
 *  Cap UI : 5 contacts max — au-delà, l'admin passe par la page contacts dédiée. */
function ContactsSection({
  contacts,
  setContacts,
  typesContactList,
}: {
  readonly contacts: DraftContact[];
  readonly setContacts: React.Dispatch<React.SetStateAction<DraftContact[]>>;
  readonly typesContactList: readonly RefItem[];
}) {
  const canAdd = contacts.length < MAX_CONTACTS_AT_CREATION;
  const noTypes = typesContactList.length === 0;

  const addContact = () => {
    setContacts((prev) => [
      ...prev,
      {
        localId: `c${String(Date.now())}-${String(prev.length)}`,
        typeContactCode: typesContactList[0]?.code ?? "",
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
      },
    ]);
  };

  const updateContact = (localId: string, patch: Partial<DraftContact>) => {
    setContacts((prev) => prev.map((c) => (c.localId === localId ? { ...c, ...patch } : c)));
  };

  const removeContact = (localId: string) => {
    setContacts((prev) => prev.filter((c) => c.localId !== localId));
  };

  return (
    <div className="border-spx-ink/10 mt-4 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-spx-ink text-sm font-medium">
          Contacts (Siège) — {contacts.length}/{MAX_CONTACTS_AT_CREATION}
        </p>
        <button
          type="button"
          onClick={addContact}
          disabled={!canAdd || noTypes}
          className="text-spx-blue-600 disabled:text-spx-ink/40 text-xs font-medium underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:no-underline"
        >
          + Ajouter un contact
        </button>
      </div>
      {noTypes && (
        <p className="text-spx-ink/60 mt-2 text-xs">
          Aucun type de contact configuré. Le SADMIN doit en créer dans /settings/team avant
          d&apos;ajouter des contacts.
        </p>
      )}
      {contacts.length > 0 && (
        <ul className="mt-3 space-y-2">
          {contacts.map((c) => (
            <li
              key={c.localId}
              className="border-spx-ink/10 rounded-md border bg-white p-2 text-xs"
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`type-${c.localId}`} className="text-[11px]">
                    Type
                  </Label>
                  <select
                    id={`type-${c.localId}`}
                    value={c.typeContactCode}
                    onChange={(e) => {
                      updateContact(c.localId, { typeContactCode: e.target.value });
                    }}
                    className="border-input bg-background h-8 w-full rounded-md border px-2 text-xs"
                  >
                    {typesContactList.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`nom-${c.localId}`} className="text-[11px]">
                    Nom *
                  </Label>
                  <Input
                    id={`nom-${c.localId}`}
                    value={c.nom}
                    onChange={(e) => {
                      updateContact(c.localId, { nom: e.target.value });
                    }}
                    className="h-8 text-xs"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`prenom-${c.localId}`} className="text-[11px]">
                    Prénom
                  </Label>
                  <Input
                    id={`prenom-${c.localId}`}
                    value={c.prenom}
                    onChange={(e) => {
                      updateContact(c.localId, { prenom: e.target.value });
                    }}
                    className="h-8 text-xs"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`email-${c.localId}`} className="text-[11px]">
                    Email
                  </Label>
                  <Input
                    id={`email-${c.localId}`}
                    type="email"
                    value={c.email}
                    onChange={(e) => {
                      updateContact(c.localId, { email: e.target.value });
                    }}
                    className="h-8 text-xs"
                    maxLength={200}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label htmlFor={`tel-${c.localId}`} className="text-[11px]">
                    Téléphone
                  </Label>
                  <Input
                    id={`tel-${c.localId}`}
                    type="tel"
                    value={c.telephone}
                    onChange={(e) => {
                      updateContact(c.localId, { telephone: e.target.value });
                    }}
                    className="h-8 text-xs"
                    maxLength={20}
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    removeContact(c.localId);
                  }}
                  className="text-destructive text-[11px] underline-offset-2 hover:underline"
                >
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
