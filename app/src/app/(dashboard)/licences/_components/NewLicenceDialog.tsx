// ==============================================================================
// LIC v2 — NewLicenceDialog (Client Component, Phase 21 R-30 wizard 3 étapes)
//
// Refacto Phase 18 R-12 (single-screen) → wizard multi-step :
//   1. Client (combobox SearchableSelect) + Entité (rechargée Server Action)
//      + Date début / Date fin + Renouvellement automatique.
//   2. Catalogue : produits actifs cochables, dépliage des articles actifs
//      cochables. Si `controleVolume === true` → input Volume autorisé requis.
//      Sinon → label "Illimité". Validation : ≥1 article coché.
//   3. Résumé + check doublon (`checkLicenceDoublonAction`) ; warning visible
//      si chevauchement licence ACTIF du client. Bouton « Créer » →
//      `createLicenceAction` (obtient l'id), puis boucle
//      `addArticleAfterCreateAction` pour chaque article sélectionné.
//
// Création + ajouts articles non-atomiques (cf. _actions.ts : un échec partiel
// laisse la licence créée avec un sous-ensemble d'articles, à compléter via
// /licences/[id]/articles).
// ==============================================================================

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

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
import { SearchableSelect } from "@/components/ui/searchable-select";

import { addProduitToLicenceAction } from "../[id]/_actions";

import {
  addArticleAfterCreateAction,
  checkLicenceDoublonAction,
  createLicenceAction,
  listEntitesForClientAction,
  type DoublonInfo,
  type EntiteOption,
} from "../_actions";

export interface ClientOption {
  readonly id: string;
  readonly codeClient: string;
  readonly raisonSociale: string;
}

export interface ProduitOption {
  readonly id: number;
  readonly code: string;
  readonly nom: string;
}

export interface ArticleOption {
  readonly id: number;
  readonly produitId: number;
  readonly code: string;
  readonly nom: string;
  readonly uniteVolume: string;
  readonly controleVolume: boolean;
}

type Step = 1 | 2 | 3;

interface ArticleSelection {
  /** true = article coché par l'utilisateur. */
  readonly checked: boolean;
  /** Volume saisi (string brute UI). Ignoré si `controleVolume === false`. */
  readonly volume: string;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);
const inYearsIso = (n: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
};

export function NewLicenceDialog({
  clients,
  produits,
  articles,
  lockedClientId,
  triggerLabel,
}: {
  readonly clients: readonly ClientOption[];
  readonly produits: readonly ProduitOption[];
  readonly articles: readonly ArticleOption[];
  /** Phase 22 R-46 — fiche client : clientId pré-sélectionné et non
   *  modifiable. Le combobox client est remplacé par un label readonly. */
  readonly lockedClientId?: string;
  readonly triggerLabel?: string;
}): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const [step, setStep] = useState<Step>(1);

  // Étape 1.
  const [clientId, setClientId] = useState<string>(lockedClientId ?? "");
  const [entites, setEntites] = useState<readonly EntiteOption[]>([]);
  const [entiteId, setEntiteId] = useState<string>("");
  const [dateDebut, setDateDebut] = useState<string>(todayIso());
  const [dateFin, setDateFin] = useState<string>(inYearsIso(2));
  const [renouvellementAuto, setRenouvellementAuto] = useState<boolean>(false);

  // Étape 2 — sélection produits + articles. La sélection produit n'envoie
  // rien au backend (pas de `addProduitToLicence` exposé en Server Action ici)
  // mais sert d'UX pour déplier/replier les articles d'un produit.
  const [produitsExpanded, setProduitsExpanded] = useState<ReadonlySet<number>>(new Set());
  const [articleSelection, setArticleSelection] = useState<
    Readonly<Record<number, ArticleSelection>>
  >({});

  // Étape 3.
  const [doublons, setDoublons] = useState<readonly DoublonInfo[]>([]);
  const [doublonChecking, setDoublonChecking] = useState<boolean>(false);
  // Phase 22 R-48 — résumé erreurs partielles ajout articles. null = pas
  // encore tenté, [] = tout OK, listé = échecs partiels affichés.
  const [articleErrors, setArticleErrors] = useState<readonly string[] | null>(null);

  // Recharge la liste des entités quand le client sélectionné change.
  useEffect(() => {
    if (clientId === "") {
      setEntites([]);
      setEntiteId("");
      return;
    }
    const state: { cancelled: boolean } = { cancelled: false };
    void (async () => {
      try {
        const list = await listEntitesForClientAction(clientId);
        if (state.cancelled) return;
        setEntites(list);
        setEntiteId(list[0]?.id ?? "");
      } catch (err) {
        if (state.cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur chargement entités");
        setEntites([]);
        setEntiteId("");
      }
    })();
    return () => {
      state.cancelled = true;
    };
  }, [clientId]);

  // Au passage à l'étape 3 : interroge le backend pour les doublons.
  useEffect(() => {
    if (step !== 3 || clientId === "") return;
    const state: { cancelled: boolean } = { cancelled: false };
    setDoublonChecking(true);
    void (async () => {
      try {
        const list = await checkLicenceDoublonAction({ clientId, dateDebut, dateFin });
        if (state.cancelled) return;
        setDoublons(list);
      } catch (err) {
        if (state.cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur vérification doublon");
        setDoublons([]);
      } finally {
        if (!state.cancelled) setDoublonChecking(false);
      }
    })();
    return () => {
      state.cancelled = true;
    };
  }, [step, clientId, dateDebut, dateFin]);

  const resetAll = (): void => {
    setStep(1);
    setError("");
    setClientId(lockedClientId ?? "");
    setEntites([]);
    setEntiteId("");
    setDateDebut(todayIso());
    setDateFin(inYearsIso(2));
    setRenouvellementAuto(false);
    setProduitsExpanded(new Set());
    setArticleSelection({});
    setDoublons([]);
    setDoublonChecking(false);
    setArticleErrors(null);
  };

  const onOpenChange = (next: boolean): void => {
    setOpen(next);
    if (!next) resetAll();
  };

  // ---------- Validation par étape ----------

  const validateStep1 = (): string | null => {
    if (clientId === "" || entiteId === "") return "Client et entité requis.";
    if (new Date(dateFin) <= new Date(dateDebut)) {
      return "La date de fin doit être strictement postérieure à la date de début.";
    }
    return null;
  };

  const selectedArticleIds = (): readonly number[] =>
    Object.entries(articleSelection)
      .filter(([, v]) => v.checked)
      .map(([k]) => Number(k));

  const validateStep2 = (): string | null => {
    const ids = selectedArticleIds();
    if (ids.length === 0) return "Sélectionnez au moins un article.";
    for (const id of ids) {
      const art = articles.find((a) => a.id === id);
      if (art === undefined) continue;
      if (!art.controleVolume) continue;
      const sel = articleSelection[id];
      if (sel === undefined) continue;
      const v = Number(sel.volume);
      if (!Number.isInteger(v) || v < 0) {
        return `Volume invalide pour l'article ${art.code} (entier ≥ 0 requis).`;
      }
    }
    return null;
  };

  // ---------- Handlers étape 2 ----------

  const toggleProduitExpand = (produitId: number): void => {
    setProduitsExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(produitId)) next.delete(produitId);
      else next.add(produitId);
      return next;
    });
  };

  const setArticleChecked = (articleId: number, checked: boolean): void => {
    setArticleSelection((prev) => {
      const current = prev[articleId] ?? { checked: false, volume: "0" };
      return { ...prev, [articleId]: { ...current, checked } };
    });
  };

  const setArticleVolume = (articleId: number, volume: string): void => {
    setArticleSelection((prev) => {
      const current = prev[articleId] ?? { checked: false, volume: "0" };
      return { ...prev, [articleId]: { ...current, volume } };
    });
  };

  // ---------- Navigation ----------

  const onNext = (): void => {
    setError("");
    if (step === 1) {
      const e = validateStep1();
      if (e !== null) {
        setError(e);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const e = validateStep2();
      if (e !== null) {
        setError(e);
        return;
      }
      setStep(3);
      return;
    }
  };

  const onBack = (): void => {
    setError("");
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  // ---------- Submit final (étape 3) ----------

  const onCreate = (): void => {
    setError("");
    const e1 = validateStep1();
    if (e1 !== null) {
      setError(e1);
      setStep(1);
      return;
    }
    const e2 = validateStep2();
    if (e2 !== null) {
      setError(e2);
      setStep(2);
      return;
    }

    startTransition(() => {
      void (async () => {
        // Phase 23 R-45 — Result tagué : la Server Action ne throw plus pour
        // les erreurs métier (Next.js sanitiserait le message). On lit
        // result.success / result.error pour propager le message AppError.
        try {
          const createRes = await createLicenceAction({
            clientId,
            entiteId,
            dateDebut,
            dateFin,
            renouvellementAuto,
          });
          if (!createRes.success) {
            setError(createRes.error);
            return;
          }
          const created = createRes.data;
          // Phase 23 — attache les produits parents avant les articles. Sans
          // cette étape, lic_licence_articles est peuplée mais lic_licence_produits
          // reste vide et /licences/[id]/articles affiche "Aucun produit attaché"
          // (les articles sont rendus groupés par produit). Les conflits "produit
          // déjà attaché" sont silencieusement ignorés.
          const ids = selectedArticleIds();
          const produitIds = new Set<number>();
          for (const id of ids) {
            const art = articles.find((a) => a.id === id);
            if (art !== undefined) produitIds.add(art.produitId);
          }
          for (const produitId of produitIds) {
            try {
              const addProd = await addProduitToLicenceAction({
                licenceId: created.id,
                produitId,
              });
              // SPX-LIC-750 = produit déjà attaché → tolérance silencieuse.
              if (!addProd.success && addProd.code !== "SPX-LIC-750") {
                // Erreur autre que "déjà attaché" — log mais on continue
                // pour permettre l'ajout des articles indépendants.

                console.warn("Échec attache produit", produitId, addProd.error);
              }
            } catch {
              // Silencieux — on continue sur les articles.
            }
          }
          // Phase 22 R-48 — boucle robuste : chaque ajout retourne un Result
          // indépendant. On collecte les échecs pour les afficher en résumé
          // (l'utilisateur peut compléter via /licences/[id]/articles).
          const failures: string[] = [];
          for (const id of ids) {
            const art = articles.find((a) => a.id === id);
            if (art === undefined) continue;
            const sel = articleSelection[id];
            const volume = art.controleVolume && sel !== undefined ? Number(sel.volume) : 0;
            try {
              const addRes = await addArticleAfterCreateAction({
                licenceId: created.id,
                articleId: id,
                volumeAutorise: Number.isFinite(volume) && volume >= 0 ? volume : 0,
              });
              if (!addRes.success) {
                failures.push(`${art.code} (${addRes.error})`);
              }
            } catch (artErr) {
              const msg = artErr instanceof Error ? artErr.message : "erreur inconnue";
              failures.push(`${art.code} (${msg})`);
            }
          }
          if (failures.length > 0) {
            // Échecs partiels — on garde le wizard ouvert avec un résumé.
            // L'utilisateur peut soit fermer + compléter sur la fiche
            // licence, soit retenter (mais la licence est déjà créée).
            setArticleErrors(failures);
            router.refresh();
            return;
          }
          // Phase 23 — `router.refresh()` AVANT `onOpenChange(false)` pour
          // garantir que le re-fetch est lancé avant le re-render du parent
          // (qui peut court-circuiter le refresh selon l'ordre React).
          router.refresh();
          setArticleErrors([]);
          onOpenChange(false);
        } catch (err) {
          // Erreur système (réseau, BD down) — pas un AppError métier.
          setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
      })();
    });
  };

  // ---------- Render helpers ----------

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.codeClient} · ${c.raisonSociale}`,
  }));
  const articlesByProduit = (produitId: number): readonly ArticleOption[] =>
    articles.filter((a) => a.produitId === produitId);
  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedEntite = entites.find((e) => e.id === entiteId);
  const totalSelected = selectedArticleIds().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>{triggerLabel ?? "+ Nouvelle licence"}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouvelle licence — étape {String(step)} / 3</DialogTitle>
        </DialogHeader>

        {/* Stepper visuel */}
        <ol className="text-muted-foreground mb-2 flex items-center gap-2 text-xs">
          {[1, 2, 3].map((n) => (
            <li
              key={n}
              className={
                n === step
                  ? "text-primary border-primary rounded-md border px-2 py-1 font-medium"
                  : n < step
                    ? "text-foreground border-border rounded-md border px-2 py-1"
                    : "border-border rounded-md border px-2 py-1"
              }
            >
              {n}. {n === 1 ? "Client & dates" : n === 2 ? "Catalogue" : "Résumé"}
            </li>
          ))}
        </ol>

        {/* ======================== Étape 1 ======================== */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="clientId">Client</Label>
              {lockedClientId !== undefined ? (
                // Phase 22 R-46 — fiche client : pré-rempli + non modifiable.
                <input
                  id="clientId"
                  readOnly
                  value={
                    selectedClient !== undefined
                      ? `${selectedClient.codeClient} · ${selectedClient.raisonSociale}`
                      : lockedClientId
                  }
                  className="border-input bg-muted text-muted-foreground h-9 w-full cursor-not-allowed rounded-md border px-3 text-sm"
                />
              ) : (
                <SearchableSelect
                  id="clientId"
                  name="clientId"
                  options={clientOptions}
                  placeholder="Rechercher un client…"
                  emptyText="Aucun client."
                  required
                  defaultValue={clientId}
                  onSelect={(v) => {
                    setClientId(v);
                  }}
                />
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="entiteId">Entité</Label>
              <select
                id="entiteId"
                value={entiteId}
                onChange={(e) => {
                  setEntiteId(e.target.value);
                }}
                required
                disabled={entites.length === 0}
                className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm disabled:opacity-50"
              >
                {entites.length === 0 ? (
                  <option value="">— Sélectionner d&apos;abord un client —</option>
                ) : (
                  entites.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="dateDebut">Date début</Label>
                <Input
                  id="dateDebut"
                  type="date"
                  value={dateDebut}
                  onChange={(e) => {
                    setDateDebut(e.target.value);
                  }}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dateFin">Date fin</Label>
                <Input
                  id="dateFin"
                  type="date"
                  value={dateFin}
                  onChange={(e) => {
                    setDateFin(e.target.value);
                  }}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="renouvellementAuto"
                type="checkbox"
                checked={renouvellementAuto}
                onChange={(e) => {
                  setRenouvellementAuto(e.target.checked);
                }}
                className="size-4"
              />
              <Label htmlFor="renouvellementAuto">
                Activer le renouvellement automatique (job batch)
              </Label>
            </div>
          </div>
        )}

        {/* ======================== Étape 2 ======================== */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs">
              Cochez au moins un article. Les articles à <strong>contrôle de volume</strong> exigent
              un volume autorisé entier ≥ 0.
            </p>
            <div className="border-border max-h-[400px] divide-y overflow-y-auto rounded-md border">
              {produits.length === 0 && (
                <p className="text-muted-foreground p-3 text-sm">
                  Aucun produit actif au catalogue.
                </p>
              )}
              {produits.map((p) => {
                const items = articlesByProduit(p.id);
                const expanded = produitsExpanded.has(p.id);
                const checkedCount = items.filter(
                  (a) => articleSelection[a.id]?.checked === true,
                ).length;
                return (
                  <div key={p.id} className="bg-card">
                    <button
                      type="button"
                      onClick={() => {
                        toggleProduitExpand(p.id);
                      }}
                      className="hover:bg-surface-2 flex w-full items-center justify-between px-3 py-2 text-left text-sm"
                    >
                      <span>
                        <span className="font-mono">{p.code}</span> · {p.nom}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {checkedCount > 0
                          ? `${String(checkedCount)}/${String(items.length)} cochés`
                          : `${String(items.length)} articles`}{" "}
                        {expanded ? "▾" : "▸"}
                      </span>
                    </button>
                    {expanded && (
                      <ul className="bg-surface-2 divide-border divide-y">
                        {items.length === 0 && (
                          <li className="text-muted-foreground px-6 py-2 text-xs">
                            Aucun article actif pour ce produit.
                          </li>
                        )}
                        {items.map((a) => {
                          const sel = articleSelection[a.id] ?? {
                            checked: false,
                            volume: "0",
                          };
                          return (
                            <li key={a.id} className="flex items-center gap-3 px-6 py-2 text-sm">
                              <input
                                id={`art-${String(a.id)}`}
                                type="checkbox"
                                checked={sel.checked}
                                onChange={(e) => {
                                  setArticleChecked(a.id, e.target.checked);
                                }}
                                className="size-4"
                              />
                              <label
                                htmlFor={`art-${String(a.id)}`}
                                className="flex-1 cursor-pointer"
                              >
                                <span className="font-mono">{a.code}</span> · {a.nom}
                              </label>
                              {a.controleVolume ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={sel.volume}
                                    onChange={(e) => {
                                      setArticleVolume(a.id, e.target.value);
                                    }}
                                    disabled={!sel.checked}
                                    className="h-8 w-24"
                                  />
                                  <span className="text-muted-foreground text-xs">
                                    {a.uniteVolume}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">
                                  Illimité
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              {totalSelected} article(s) sélectionné(s).
            </p>
          </div>
        )}

        {/* ======================== Étape 3 ======================== */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="border-border bg-card space-y-2 rounded-md border p-3 text-sm">
              <div>
                <span className="text-muted-foreground">Client : </span>
                <span className="font-medium">
                  {selectedClient !== undefined
                    ? `${selectedClient.codeClient} · ${selectedClient.raisonSociale}`
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Entité : </span>
                <span className="font-medium">{selectedEntite?.nom ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Période : </span>
                <span className="font-medium">
                  {dateDebut} → {dateFin}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Renouvellement auto : </span>
                <span className="font-medium">{renouvellementAuto ? "Oui" : "Non"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Articles : </span>
                <span className="font-medium">{totalSelected}</span>
              </div>
            </div>

            {doublonChecking && (
              <p className="text-muted-foreground text-xs">Vérification des doublons…</p>
            )}
            {!doublonChecking && doublons.length > 0 && (
              <div
                role="alert"
                className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
              >
                <p className="font-medium">⚠ Licence(s) ACTIF déjà chevauchante(s) :</p>
                <ul className="mt-1 list-disc pl-5">
                  {doublons.map((d) => (
                    <li key={d.reference} className="font-mono text-xs">
                      {d.reference} ({d.dateDebut} → {d.dateFin})
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs">Vous pouvez créer la licence quand même.</p>
              </div>
            )}

            {/* Phase 22 R-48 — résumé erreurs partielles ajout articles. */}
            {articleErrors !== null && articleErrors.length > 0 && (
              <div
                role="alert"
                className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900"
              >
                <p className="font-medium">
                  Licence créée — {String(articleErrors.length)} article(s) non attaché(s) :
                </p>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {articleErrors.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs">
                  Compléter manuellement via la fiche licence (onglet Articles).
                </p>
              </div>
            )}
          </div>
        )}

        {error.length > 0 && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
            }}
            disabled={pending}
          >
            Annuler
          </Button>
          {step > 1 && (
            <Button type="button" variant="ghost" onClick={onBack} disabled={pending}>
              Précédent
            </Button>
          )}
          {step < 3 && (
            <Button type="button" onClick={onNext} disabled={pending}>
              Suivant
            </Button>
          )}
          {step === 3 && (
            <Button type="button" onClick={onCreate} disabled={pending}>
              {pending ? "Création…" : "Créer"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
