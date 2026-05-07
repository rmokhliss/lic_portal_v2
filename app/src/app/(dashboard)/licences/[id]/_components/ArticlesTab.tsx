// ==============================================================================
// LIC v2 — ArticlesTab (Phase 6.F)
//
// Affiche les produits attachés à la licence (en sections) avec leurs articles
// (volume autorisé/consommé/taux). 4 actions :
//   - Ajouter un produit (Dialog avec sélecteur produits actifs non encore attachés)
//   - Retirer un produit (avec confirmation — supprime aussi les articles ?
//     Non, on conserve : R-35 — l'admin doit retirer chaque article d'abord)
//   - Ajouter un article (Dialog : sélecteur articles du produit + volume autorisé)
//   - Modifier le volume autorisé d'un article (Dialog volume + raison)
//   - Retirer un article (avec confirmation)
// ==============================================================================

"use client";

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

import {
  addArticleToLicenceAction,
  addProduitToLicenceAction,
  removeArticleFromLicenceAction,
  removeProduitFromLicenceAction,
  updateArticleVolumeAction,
} from "../_actions";
import type {
  ArticleClientDTO,
  ArticleWithLiaisonDTO,
  ProduitClientDTO,
  ProduitWithLiaisonDTO,
} from "./articles-types";

export interface ArticlesTabProps {
  readonly licenceId: string;
  readonly produits: readonly ProduitWithLiaisonDTO[];
  readonly articles: readonly ArticleWithLiaisonDTO[];
  /** Catalogue complet : produits actifs non encore attachés. */
  readonly produitsCatalogue: readonly ProduitClientDTO[];
  /** Articles actifs du catalogue, indexés par produitId pour la sélection. */
  readonly articlesCatalogueByProduit: Readonly<Record<number, readonly ArticleClientDTO[]>>;
  readonly canEdit: boolean;
}

type Dialog =
  | { kind: "none" }
  | { kind: "addProduit" }
  | { kind: "addArticle"; produitId: number; produitNom: string }
  | {
      kind: "editVolume";
      liaisonId: string;
      currentAutorise: number;
      currentConsomme: number;
      articleNom: string;
      controleVolume: boolean;
    };

export function ArticlesTab(props: ArticlesTabProps) {
  const t = useTranslations("licences.detail.articles");
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });

  const articlesByProduit = new Map<number, ArticleWithLiaisonDTO[]>();
  for (const a of props.articles) {
    if (a.article === null) continue;
    const list = articlesByProduit.get(a.article.produitId) ?? [];
    list.push(a);
    articlesByProduit.set(a.article.produitId, list);
  }

  const attachedProduitIds = new Set(props.produits.map((p) => p.liaison.produitId));
  const candidatesProduits = props.produitsCatalogue.filter(
    (p) => p.actif && !attachedProduitIds.has(p.id),
  );

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-foreground text-lg">{t("section")}</h2>
        {props.canEdit && (
          <Button
            type="button"
            disabled={candidatesProduits.length === 0}
            onClick={() => {
              setDialog({ kind: "addProduit" });
            }}
          >
            {t("addProduit")}
          </Button>
        )}
      </div>

      {props.produits.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">{t("emptyProduits")}</p>
      ) : (
        <div className="mt-4 space-y-6">
          {props.produits.map((p) => {
            if (p.produit === null) return null;
            const articles = articlesByProduit.get(p.produit.id) ?? [];
            const candidatesArticles = (
              props.articlesCatalogueByProduit[p.produit.id] ?? []
            ).filter((a) => a.actif && !articles.some((x) => x.article?.id === a.id));
            return (
              <ProduitSection
                key={p.liaison.id}
                liaisonId={p.liaison.id}
                licenceId={props.licenceId}
                produit={p.produit}
                articles={articles}
                canEdit={props.canEdit}
                hasCandidatesArticles={candidatesArticles.length > 0}
                onAddArticle={() => {
                  if (p.produit !== null) {
                    setDialog({
                      kind: "addArticle",
                      produitId: p.produit.id,
                      produitNom: p.produit.nom,
                    });
                  }
                }}
                onEditVolume={(la) => {
                  setDialog({
                    kind: "editVolume",
                    liaisonId: la.liaison.id,
                    currentAutorise: la.liaison.volumeAutorise,
                    currentConsomme: la.liaison.volumeConsomme,
                    articleNom: la.article?.nom ?? "",
                    // Phase 20 R-32 — si l'article est en illimité, on
                    // n'affiche pas le champ vol autorisé dans le dialog
                    // (cf. EditVolumeDialog ci-dessous).
                    controleVolume: la.article?.controleVolume ?? true,
                  });
                }}
              />
            );
          })}
        </div>
      )}

      <AddProduitDialog
        open={dialog.kind === "addProduit"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "none" });
        }}
        licenceId={props.licenceId}
        candidates={candidatesProduits}
      />

      <AddArticleDialog
        state={dialog}
        licenceId={props.licenceId}
        articlesCatalogueByProduit={props.articlesCatalogueByProduit}
        attachedArticleIds={
          new Set(props.articles.flatMap((a) => (a.article === null ? [] : [a.article.id])))
        }
        onClose={() => {
          setDialog({ kind: "none" });
        }}
      />

      <EditVolumeDialog
        state={dialog}
        licenceId={props.licenceId}
        onClose={() => {
          setDialog({ kind: "none" });
        }}
      />
    </>
  );
}

function ProduitSection({
  liaisonId,
  licenceId,
  produit,
  articles,
  canEdit,
  hasCandidatesArticles,
  onAddArticle,
  onEditVolume,
}: {
  readonly liaisonId: string;
  readonly licenceId: string;
  readonly produit: ProduitClientDTO;
  readonly articles: readonly ArticleWithLiaisonDTO[];
  readonly canEdit: boolean;
  readonly hasCandidatesArticles: boolean;
  readonly onAddArticle: () => void;
  readonly onEditVolume: (la: ArticleWithLiaisonDTO) => void;
}) {
  const t = useTranslations("licences.detail.articles");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onRemoveProduit = () => {
    if (!window.confirm(t("confirmRemoveProduit"))) return;
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const r = await removeProduitFromLicenceAction({ id: liaisonId }, { licenceId });
          if (!r.success) {
            setError(r.error);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <section className="border-border rounded-md border p-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-foreground text-base">
            {produit.nom}{" "}
            <span className="text-muted-foreground font-mono text-xs">({produit.code})</span>
          </h3>
          {produit.description !== null && (
            <p className="text-muted-foreground mt-1 text-sm">{produit.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasCandidatesArticles}
              onClick={onAddArticle}
            >
              {t("addArticle")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending || articles.length > 0}
              onClick={onRemoveProduit}
              title={articles.length > 0 ? t("removeProduitBlocked") : undefined}
            >
              {t("removeProduit")}
            </Button>
          </div>
        )}
      </header>

      {error !== "" && <p className="text-destructive mt-2 text-xs">{error}</p>}

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.code")}</TableHead>
            <TableHead>{t("table.nom")}</TableHead>
            <TableHead>{t("table.unite")}</TableHead>
            <TableHead className="text-right">{t("table.consomme")}</TableHead>
            <TableHead className="text-right">{t("table.autorise")}</TableHead>
            <TableHead className="text-right">{t("table.taux")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground text-center text-sm">
                {t("emptyArticles")}
              </TableCell>
            </TableRow>
          ) : (
            articles.map((a) => (
              <ArticleRow
                key={a.liaison.id}
                liaison={a}
                licenceId={licenceId}
                canEdit={canEdit}
                onEditVolume={() => {
                  onEditVolume(a);
                }}
              />
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}

function ArticleRow({
  liaison,
  licenceId,
  canEdit,
  onEditVolume,
}: {
  readonly liaison: ArticleWithLiaisonDTO;
  readonly licenceId: string;
  readonly canEdit: boolean;
  readonly onEditVolume: () => void;
}) {
  const t = useTranslations("licences.detail.articles");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onRemove = () => {
    if (!window.confirm(t("confirmRemoveArticle"))) return;
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const r = await removeArticleFromLicenceAction({ id: liaison.liaison.id }, { licenceId });
          if (!r.success) {
            setError(r.error);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  // Phase 19 R-13 — controleVolume=false → article "fonctionnalité",
  // volume illimité. On force ratio=0 et on affiche un placeholder.
  const isUnlimited = liaison.article?.controleVolume === false;
  const ratio =
    isUnlimited || liaison.liaison.volumeAutorise === 0
      ? 0
      : (liaison.liaison.volumeConsomme / liaison.liaison.volumeAutorise) * 100;
  const ratioClass =
    ratio >= 100 ? "text-destructive" : ratio >= 80 ? "text-warning" : "text-success";

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{liaison.article?.code ?? "-"}</TableCell>
      <TableCell className="text-sm">{liaison.article?.nom ?? "-"}</TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {liaison.article?.uniteVolume ?? "-"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {isUnlimited ? "—" : liaison.liaison.volumeConsomme.toLocaleString("fr-FR")}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {isUnlimited ? (
          <span
            className="text-muted-foreground italic"
            title="Article fonctionnalité — volume non contrôlé"
          >
            Illimité
          </span>
        ) : (
          liaison.liaison.volumeAutorise.toLocaleString("fr-FR")
        )}
      </TableCell>
      <TableCell
        className={`text-right tabular-nums ${isUnlimited ? "text-muted-foreground" : ratioClass}`}
      >
        {isUnlimited ? "—" : `${ratio.toFixed(1)}%`}
      </TableCell>
      <TableCell className="text-right">
        {canEdit && (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onEditVolume}>
              {t("editVolume")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={onRemove}
            >
              {t("removeArticle")}
            </Button>
          </div>
        )}
        {error !== "" && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </TableCell>
    </TableRow>
  );
}

function AddProduitDialog({
  open,
  onOpenChange,
  licenceId,
  candidates,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly licenceId: string;
  readonly candidates: readonly ProduitClientDTO[];
}) {
  const t = useTranslations("licences.detail.articles.addProduitDialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const idStr = fd.get("produitId");
    if (typeof idStr !== "string" || idStr.length === 0) return;
    const produitId = Number(idStr);
    startTransition(() => {
      void (async () => {
        try {
          const r = await addProduitToLicenceAction({ licenceId, produitId });
          if (!r.success) {
            setError(r.error);
            return;
          }
          setError("");
          onOpenChange(false);
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
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="produitId">{t("produitLabel")}</Label>
            <select
              id="produitId"
              name="produitId"
              required
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">{t("placeholder")}</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} ({p.code})
                </option>
              ))}
            </select>
          </div>
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
              {pending ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddArticleDialog({
  state,
  licenceId,
  articlesCatalogueByProduit,
  attachedArticleIds,
  onClose,
}: {
  readonly state: Dialog;
  readonly licenceId: string;
  readonly articlesCatalogueByProduit: Readonly<Record<number, readonly ArticleClientDTO[]>>;
  readonly attachedArticleIds: ReadonlySet<number>;
  readonly onClose: () => void;
}) {
  const t = useTranslations("licences.detail.articles.addArticleDialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  // Phase 19 R-13 — track l'article sélectionné pour masquer/afficher le
  // champ volumeAutorise selon son controleVolume.
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");

  if (state.kind !== "addArticle") return null;

  const candidates = (articlesCatalogueByProduit[state.produitId] ?? []).filter(
    (a) => a.actif && !attachedArticleIds.has(a.id),
  );

  const selectedArticle =
    selectedArticleId === ""
      ? null
      : (candidates.find((a) => a.id === Number(selectedArticleId)) ?? null);
  const isUnlimited = selectedArticle !== null && !selectedArticle.controleVolume;

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const articleIdStr = fd.get("articleId");
    if (typeof articleIdStr !== "string") return;
    const articleId = Number(articleIdStr);
    // Phase 19 R-13 — pour un article fonctionnalité (controleVolume=false),
    // on persiste volumeAutorise=0 ; le rendu UI affiche "Illimité" via le
    // flag article.controleVolume (cf. ArticleRow ci-dessus).
    const volumeAutorise = isUnlimited ? 0 : Number(fd.get("volumeAutorise"));
    startTransition(() => {
      void (async () => {
        try {
          const r = await addArticleToLicenceAction({ licenceId, articleId, volumeAutorise });
          if (!r.success) {
            setError(r.error);
            return;
          }
          setError("");
          onClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { produit: state.produitNom })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="articleId">{t("articleLabel")}</Label>
            <select
              id="articleId"
              name="articleId"
              required
              value={selectedArticleId}
              onChange={(e) => {
                setSelectedArticleId(e.target.value);
              }}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">{t("placeholder")}</option>
              {candidates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom} ({a.code}) — {a.uniteVolume}
                  {!a.controleVolume ? " · Illimité" : ""}
                </option>
              ))}
            </select>
          </div>
          {isUnlimited ? (
            <p className="text-muted-foreground rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
              Article « fonctionnalité » — volume non contrôlé. Aucun vol autorisé à saisir,
              l&apos;article sera enregistré en illimité.
            </p>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="volumeAutorise">{t("volumeLabel")}</Label>
              <Input
                id="volumeAutorise"
                name="volumeAutorise"
                type="number"
                min={0}
                step={1}
                required
              />
            </div>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditVolumeDialog({
  state,
  licenceId,
  onClose,
}: {
  readonly state: Dialog;
  readonly licenceId: string;
  readonly onClose: () => void;
}) {
  const t = useTranslations("licences.detail.articles.editVolumeDialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  if (state.kind !== "editVolume") return null;

  // Phase 20 R-32 — capture state.* maintenant pour éviter le narrow
  // TypeScript dans le onSubmit (fermé sur la valeur courante).
  const stateLiaisonId = state.liaisonId;
  const stateControleVolume = state.controleVolume;

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Phase 20 R-32 — payload partiel : on n'envoie que les champs édités
    // (le use-case UpdateArticleVolumeUseCase accepte les 2 optionnels).
    const payload: { id: string; volumeAutorise?: number; volumeConsomme?: number } = {
      id: stateLiaisonId,
    };
    if (stateControleVolume) {
      const volAutoStr = fd.get("volumeAutorise");
      if (typeof volAutoStr === "string" && volAutoStr.length > 0) {
        payload.volumeAutorise = Number(volAutoStr);
      }
    }
    const volConsoStr = fd.get("volumeConsomme");
    if (typeof volConsoStr === "string" && volConsoStr.length > 0) {
      payload.volumeConsomme = Number(volConsoStr);
    }
    startTransition(() => {
      void (async () => {
        try {
          const r = await updateArticleVolumeAction(payload, { licenceId });
          if (!r.success) {
            setError(r.error);
            return;
          }
          setError("");
          onClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { article: state.articleNom })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {/* Phase 20 R-32 — édition séparée vol autorisé + vol consommé.
              Le champ vol autorisé est masqué pour les articles
              fonctionnalité (controleVolume=false) — illimité. Le champ
              vol consommé reste éditable (cas de correction manuelle
              admin avant le prochain snapshot Phase 8 batch). */}
          {state.controleVolume ? (
            <div className="space-y-1">
              <Label htmlFor="volumeAutorise">{t("volumeLabel")}</Label>
              <Input
                id="volumeAutorise"
                name="volumeAutorise"
                type="number"
                min={0}
                step={1}
                defaultValue={state.currentAutorise}
              />
            </div>
          ) : (
            <p className="text-muted-foreground rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
              Article « fonctionnalité » — volume autorisé non applicable (illimité).
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="volumeConsomme">Volume consommé (correction manuelle)</Label>
            <Input
              id="volumeConsomme"
              name="volumeConsomme"
              type="number"
              min={0}
              step={1}
              defaultValue={state.currentConsomme}
            />
            <p className="text-muted-foreground text-xs">
              Valeur normalement recalculée par le job batch snapshot. Édition manuelle utile pour
              corriger un import healthcheck erroné.
            </p>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
