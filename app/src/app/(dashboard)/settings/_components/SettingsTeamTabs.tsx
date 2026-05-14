// ==============================================================================
// LIC v2 — SettingsTeamTabs (Phase 2.B étape 7/7)
//
// Client Component : 6 sous-onglets shadcn Tabs (Régions / Pays / Devises /
// Langues / Types contact / Équipe). Chaque sous-onglet rend une <RefSection>
// avec sa table + bouton Ajouter (Dialog) + toggle actif par ligne.
//
// Les 6 listes initiales arrivent en props depuis le Server Component parent
// (team/page.tsx). Les Server Actions de création/toggle revalident la route
// → next/cache rafraîchit les listes au prochain render.
// ==============================================================================

"use client";

import { useState, useTransition } from "react";

import type {
  ClientRefDTO,
  DeviseDTO,
  LangueDTO,
  PaysDTO,
  RegionDTO,
  TeamMemberDTO,
  TypeContactDTO,
} from "./settings-team-types";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  createDeviseAction,
  createLangueAction,
  createPaysAction,
  createRegionAction,
  createTeamMemberAction,
  createTypeContactAction,
  toggleDeviseAction,
  toggleLangueAction,
  togglePaysAction,
  toggleRegionAction,
  toggleTeamMemberAction,
  toggleTypeContactAction,
  updateDeviseAction,
  updateLangueAction,
  updatePaysAction,
  updateRegionAction,
  updateTeamMemberAction,
  updateTypeContactAction,
} from "../_actions";

import { RefEditDialog } from "./RefEditDialog";

export interface SettingsTeamTabsProps {
  readonly regions: readonly RegionDTO[];
  readonly pays: readonly PaysDTO[];
  readonly devises: readonly DeviseDTO[];
  readonly langues: readonly LangueDTO[];
  readonly typesContact: readonly TypeContactDTO[];
  readonly teamMembers: readonly TeamMemberDTO[];
  /** Phase 24 — référentiel des codes clients S2M (lecture seule UI). */
  readonly clientsRef: readonly ClientRefDTO[];
}

const SUBTABS = [
  "regions",
  "pays",
  "devises",
  "langues",
  "types-contact",
  "team-members",
  "clients",
] as const;
type SubTab = (typeof SUBTABS)[number];
const SUBTAB_LABELS: Record<SubTab, string> = {
  regions: "Régions",
  pays: "Pays",
  devises: "Devises",
  langues: "Langues",
  "types-contact": "Types contact",
  "team-members": "Équipe",
  clients: "Clients",
};

export function SettingsTeamTabs(props: SettingsTeamTabsProps) {
  return (
    <Tabs defaultValue="regions" className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto">
        {SUBTABS.map((tab) => (
          <TabsTrigger key={tab} value={tab}>
            {SUBTAB_LABELS[tab]}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="regions" className="mt-6">
        <RegionsSection rows={props.regions} />
      </TabsContent>
      <TabsContent value="pays" className="mt-6">
        <PaysSection rows={props.pays} />
      </TabsContent>
      <TabsContent value="devises" className="mt-6">
        <DevisesSection rows={props.devises} />
      </TabsContent>
      <TabsContent value="langues" className="mt-6">
        <LanguesSection rows={props.langues} />
      </TabsContent>
      <TabsContent value="types-contact" className="mt-6">
        <TypesContactSection rows={props.typesContact} />
      </TabsContent>
      <TabsContent value="team-members" className="mt-6">
        <TeamMembersSection rows={props.teamMembers} />
      </TabsContent>
      <TabsContent value="clients" className="mt-6">
        <ClientsRefSection rows={props.clientsRef} />
      </TabsContent>
    </Tabs>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function ToggleButton({
  actif,
  onToggle,
}: {
  readonly actif: boolean;
  readonly onToggle: () => Promise<unknown>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={actif ? "outline" : "secondary"}
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          void onToggle();
        });
      }}
    >
      {actif ? "Désactiver" : "Activer"}
    </Button>
  );
}

function SectionHeader({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-display text-foreground text-lg">{title}</h3>
      {children}
    </div>
  );
}

function ActifBadge({ actif }: { readonly actif: boolean }) {
  return (
    <span
      className={
        actif
          ? "inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800"
          : "inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
      }
    >
      {actif ? "Actif" : "Inactif"}
    </span>
  );
}

// ============================================================================
// 6 sections
// ============================================================================

function RegionsSection({ rows }: { readonly rows: readonly RegionDTO[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SectionHeader title="Régions commerciales">
        <AddRegionDialog open={open} onOpenChange={setOpen} />
      </SectionHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>DM responsable</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                Aucune région.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.regionCode}>
                <TableCell className="font-mono text-xs">{r.regionCode}</TableCell>
                <TableCell>{r.nom}</TableCell>
                <TableCell>{r.dmResponsable ?? "—"}</TableCell>
                <TableCell>
                  <ActifBadge actif={r.actif} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <RefEditDialog
                      title={`Modifier ${r.regionCode}`}
                      fields={[
                        {
                          name: "regionCode",
                          label: "Code",
                          defaultValue: r.regionCode,
                          immutable: true,
                        },
                        {
                          name: "nom",
                          label: "Nom",
                          defaultValue: r.nom,
                          required: true,
                          maxLength: 100,
                        },
                        {
                          name: "dmResponsable",
                          label: "DM responsable",
                          defaultValue: r.dmResponsable ?? "",
                          nullable: true,
                          maxLength: 100,
                        },
                      ]}
                      onSubmit={(p) => updateRegionAction(p)}
                    />
                    <ToggleButton
                      actif={r.actif}
                      onToggle={() => toggleRegionAction({ regionCode: r.regionCode })}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}

function AddRegionDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">Ajouter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle région</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const payload = {
              regionCode: strReq(fd.get("regionCode")),
              nom: strReq(fd.get("nom")),
              dmResponsable: strOpt(fd.get("dmResponsable")),
            };
            startTransition(() => {
              void (async () => {
                try {
                  await createRegionAction(payload);
                  setError("");
                  onOpenChange(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erreur");
                }
              })();
            });
          }}
          className="space-y-4"
        >
          <Field label="Code (UPPER_SNAKE)" name="regionCode" required />
          <Field label="Nom" name="nom" required />
          <Field label="DM responsable (optionnel)" name="dmResponsable" />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaysSection({ rows }: { readonly rows: readonly PaysDTO[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SectionHeader title="Pays (ISO 3166-1)">
        <AddPaysDialog open={open} onOpenChange={setOpen} />
      </SectionHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Région</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                Aucun pays.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.codePays}>
                <TableCell className="font-mono text-xs">{r.codePays}</TableCell>
                <TableCell>{r.nom}</TableCell>
                <TableCell>{r.regionCode ?? "—"}</TableCell>
                <TableCell>
                  <ActifBadge actif={r.actif} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <RefEditDialog
                      title={`Modifier ${r.codePays}`}
                      fields={[
                        {
                          name: "codePays",
                          label: "Code ISO",
                          defaultValue: r.codePays,
                          immutable: true,
                        },
                        {
                          name: "nom",
                          label: "Nom",
                          defaultValue: r.nom,
                          required: true,
                          maxLength: 100,
                        },
                        {
                          name: "regionCode",
                          label: "Code région",
                          defaultValue: r.regionCode ?? "",
                          nullable: true,
                          maxLength: 50,
                        },
                      ]}
                      onSubmit={(p) => updatePaysAction(p)}
                    />
                    <ToggleButton
                      actif={r.actif}
                      onToggle={() => togglePaysAction({ codePays: r.codePays })}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}

function AddPaysDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">Ajouter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau pays</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const payload = {
              codePays: strReq(fd.get("codePays")).toUpperCase(),
              nom: strReq(fd.get("nom")),
              regionCode: strOpt(fd.get("regionCode")),
            };
            startTransition(() => {
              void (async () => {
                try {
                  await createPaysAction(payload);
                  setError("");
                  onOpenChange(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erreur");
                }
              })();
            });
          }}
          className="space-y-4"
        >
          <Field label="Code ISO alpha-2 (2 lettres)" name="codePays" required maxLength={2} />
          <Field label="Nom" name="nom" required />
          <Field label="Région (UPPER_SNAKE, optionnel)" name="regionCode" />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DevisesSection({ rows }: { readonly rows: readonly DeviseDTO[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SectionHeader title="Devises (ISO 4217)">
        <AddDeviseDialog open={open} onOpenChange={setOpen} />
      </SectionHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Symbole</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                Aucune devise.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.codeDevise}>
                <TableCell className="font-mono text-xs">{r.codeDevise}</TableCell>
                <TableCell>{r.nom}</TableCell>
                <TableCell>{r.symbole ?? "—"}</TableCell>
                <TableCell>
                  <ActifBadge actif={r.actif} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <RefEditDialog
                      title={`Modifier ${r.codeDevise}`}
                      fields={[
                        {
                          name: "codeDevise",
                          label: "Code ISO 4217",
                          defaultValue: r.codeDevise,
                          immutable: true,
                        },
                        {
                          name: "nom",
                          label: "Nom",
                          defaultValue: r.nom,
                          required: true,
                          maxLength: 100,
                        },
                        {
                          name: "symbole",
                          label: "Symbole",
                          defaultValue: r.symbole ?? "",
                          nullable: true,
                          maxLength: 10,
                        },
                      ]}
                      onSubmit={(p) => updateDeviseAction(p)}
                    />
                    <ToggleButton
                      actif={r.actif}
                      onToggle={() => toggleDeviseAction({ codeDevise: r.codeDevise })}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}

function AddDeviseDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">Ajouter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle devise</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const payload = {
              codeDevise: strReq(fd.get("codeDevise")).toUpperCase(),
              nom: strReq(fd.get("nom")),
              symbole: strReq(fd.get("symbole")),
            };
            startTransition(() => {
              void (async () => {
                try {
                  await createDeviseAction(payload);
                  setError("");
                  onOpenChange(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erreur");
                }
              })();
            });
          }}
          className="space-y-4"
        >
          <Field label="Code ISO 4217 (3 lettres)" name="codeDevise" required maxLength={3} />
          <Field label="Nom" name="nom" required />
          <Field label="Symbole" name="symbole" required />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LanguesSection({ rows }: { readonly rows: readonly LangueDTO[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SectionHeader title="Langues UI">
        <AddLangueDialog open={open} onOpenChange={setOpen} />
      </SectionHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground text-center text-sm">
                Aucune langue.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.codeLangue}>
                <TableCell className="font-mono text-xs">{r.codeLangue}</TableCell>
                <TableCell>{r.nom}</TableCell>
                <TableCell>
                  <ActifBadge actif={r.actif} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <RefEditDialog
                      title={`Modifier ${r.codeLangue}`}
                      fields={[
                        {
                          name: "codeLangue",
                          label: "Code ISO 639-1",
                          defaultValue: r.codeLangue,
                          immutable: true,
                        },
                        {
                          name: "nom",
                          label: "Nom",
                          defaultValue: r.nom,
                          required: true,
                          maxLength: 100,
                        },
                      ]}
                      onSubmit={(p) => updateLangueAction(p)}
                    />
                    <ToggleButton
                      actif={r.actif}
                      onToggle={() => toggleLangueAction({ codeLangue: r.codeLangue })}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}

function AddLangueDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">Ajouter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle langue</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const payload = {
              codeLangue: strReq(fd.get("codeLangue")).toLowerCase(),
              nom: strReq(fd.get("nom")),
            };
            startTransition(() => {
              void (async () => {
                try {
                  await createLangueAction(payload);
                  setError("");
                  onOpenChange(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erreur");
                }
              })();
            });
          }}
          className="space-y-4"
        >
          <Field label="Code ISO 639-1 (2 lettres)" name="codeLangue" required maxLength={2} />
          <Field label="Nom (langue native)" name="nom" required />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TypesContactSection({ rows }: { readonly rows: readonly TypeContactDTO[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SectionHeader title="Types de contact">
        <AddTypeContactDialog open={open} onOpenChange={setOpen} />
      </SectionHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Libellé</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground text-center text-sm">
                Aucun type.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.code}>
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell>{r.libelle}</TableCell>
                <TableCell>
                  <ActifBadge actif={r.actif} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <RefEditDialog
                      title={`Modifier ${r.code}`}
                      fields={[
                        { name: "code", label: "Code", defaultValue: r.code, immutable: true },
                        {
                          name: "libelle",
                          label: "Libellé",
                          defaultValue: r.libelle,
                          required: true,
                          maxLength: 100,
                        },
                      ]}
                      onSubmit={(p) => updateTypeContactAction(p)}
                    />
                    <ToggleButton
                      actif={r.actif}
                      onToggle={() => toggleTypeContactAction({ code: r.code })}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}

function AddTypeContactDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">Ajouter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau type de contact</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const payload = {
              code: strReq(fd.get("code")).toUpperCase(),
              libelle: strReq(fd.get("libelle")),
            };
            startTransition(() => {
              void (async () => {
                try {
                  await createTypeContactAction(payload);
                  setError("");
                  onOpenChange(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erreur");
                }
              })();
            });
          }}
          className="space-y-4"
        >
          <Field label="Code (UPPER_SNAKE)" name="code" required />
          <Field label="Libellé" name="libelle" required />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TeamMembersSection({ rows }: { readonly rows: readonly TeamMemberDTO[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SectionHeader title="Équipe S2M">
        <AddTeamMemberDialog open={open} onOpenChange={setOpen} />
      </SectionHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Région</TableHead>
            <TableHead>État</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground text-center text-sm">
                Aucun membre.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.prenom ?? ""} {r.nom}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{r.email ?? "—"}</TableCell>
                <TableCell>{r.roleTeam}</TableCell>
                <TableCell>{r.regionCode ?? "—"}</TableCell>
                <TableCell>
                  <ActifBadge actif={r.actif} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <RefEditDialog
                      title={`Modifier ${r.prenom ?? ""} ${r.nom}`}
                      fields={[
                        { name: "id", label: "ID", defaultValue: String(r.id), immutable: true },
                        {
                          name: "nom",
                          label: "Nom",
                          defaultValue: r.nom,
                          required: true,
                          maxLength: 100,
                        },
                        {
                          name: "prenom",
                          label: "Prénom",
                          defaultValue: r.prenom ?? "",
                          nullable: true,
                          maxLength: 100,
                        },
                        {
                          name: "email",
                          label: "Email",
                          type: "email",
                          defaultValue: r.email ?? "",
                          nullable: true,
                          maxLength: 150,
                        },
                        {
                          name: "telephone",
                          label: "Téléphone",
                          defaultValue: r.telephone ?? "",
                          nullable: true,
                          maxLength: 50,
                        },
                        {
                          name: "roleTeam",
                          label: "Rôle",
                          type: "select",
                          defaultValue: r.roleTeam,
                          required: true,
                          options: [
                            { value: "SALES", label: "SALES" },
                            { value: "AM", label: "AM (Account Manager)" },
                            { value: "DM", label: "DM (Directeur Métier)" },
                          ],
                        },
                        {
                          name: "regionCode",
                          label: "Code région",
                          defaultValue: r.regionCode ?? "",
                          nullable: true,
                          maxLength: 50,
                        },
                      ]}
                      onSubmit={async (p) => {
                        // RefEditDialog passe `id` en string ; le use-case attend number.
                        const idStr = p.id;
                        if (idStr === null || idStr === undefined) return;
                        await updateTeamMemberAction({ ...p, id: Number(idStr) });
                      }}
                    />
                    <ToggleButton
                      actif={r.actif}
                      onToggle={() => toggleTeamMemberAction({ id: r.id })}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}

function AddTeamMemberDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">Ajouter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau membre équipe</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const payload = {
              nom: strReq(fd.get("nom")).toUpperCase(),
              prenom: strReq(fd.get("prenom")),
              email: strReq(fd.get("email")),
              roleTeam: (strReq(fd.get("roleTeam")) || "SALES") as "SALES" | "AM" | "DM",
              regionCode: strOpt(fd.get("regionCode")),
            };
            startTransition(() => {
              void (async () => {
                try {
                  await createTeamMemberAction(payload);
                  setError("");
                  onOpenChange(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erreur");
                }
              })();
            });
          }}
          className="space-y-4"
        >
          <Field label="Nom (UPPERCASE)" name="nom" required />
          <Field label="Prénom" name="prenom" required />
          <Field label="Email" name="email" type="email" required />
          <div className="space-y-1">
            <Label htmlFor="roleTeam">Rôle</Label>
            <select
              id="roleTeam"
              name="roleTeam"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              defaultValue="SALES"
            >
              <option value="SALES">SALES</option>
              <option value="AM">AM (Account Manager)</option>
              <option value="DM">DM (Directeur Métier)</option>
            </select>
          </div>
          <Field label="Code région (optionnel, requis pour DM)" name="regionCode" />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Form helpers
// ============================================================================

function Field({
  label,
  name,
  type = "text",
  required = false,
  maxLength,
}: {
  readonly label: string;
  readonly name: string;
  readonly type?: string;
  readonly required?: boolean;
  readonly maxLength?: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} maxLength={maxLength} />
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

// ============================================================================
// Phase 24 — Clients (référentiel des codes clients S2M, lecture seule)
// ============================================================================

const CLIENTS_REF_PAGE_SIZE = 20;

function ClientsRefSection({ rows }: { readonly rows: readonly ClientRefDTO[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const q = query.trim().toLowerCase();
  const filtered =
    q.length === 0
      ? rows
      : rows.filter(
          (r) =>
            r.codeClient.toLowerCase().includes(q) || r.raisonSociale.toLowerCase().includes(q),
        );
  const totalPages = Math.max(1, Math.ceil(filtered.length / CLIENTS_REF_PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    safePage * CLIENTS_REF_PAGE_SIZE,
    (safePage + 1) * CLIENTS_REF_PAGE_SIZE,
  );

  return (
    <>
      <SectionHeader title={`Clients S2M (${String(rows.length)})`}>
        <Input
          placeholder="Rechercher code ou raison sociale…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          className="w-72"
        />
      </SectionHeader>
      <p className="text-muted-foreground mb-3 text-xs">
        Référentiel en lecture seule. Alimenté par le seed bootstrap — sert à l&apos;autocomplétion
        à la création d&apos;un client (saisie libre toujours autorisée).
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Raison sociale</TableHead>
            <TableHead>État</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground text-center text-sm">
                {q.length === 0 ? "Aucun client référencé." : "Aucun résultat."}
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((r) => (
              <TableRow key={r.codeClient}>
                <TableCell className="font-mono text-xs">{r.codeClient}</TableCell>
                <TableCell>{r.raisonSociale}</TableCell>
                <TableCell>
                  <ActifBadge actif={r.actif} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {String(safePage + 1)} / {String(totalPages)} — {String(filtered.length)} résultat
            {filtered.length > 1 ? "s" : ""}
          </span>
          <div className="inline-flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => {
                setPage((p) => Math.max(0, p - 1));
              }}
            >
              Précédent
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => {
                setPage((p) => Math.min(totalPages - 1, p + 1));
              }}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
