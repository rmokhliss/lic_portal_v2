// ==============================================================================
// LIC v2 — CataloguesPanel (Phase 6.F)
//
// Onglet /settings/catalogues : 1 section par produit + table de ses articles.
// SADMIN uniquement (la garde est posée dans les Server Actions).
//
// Actions disponibles :
//   - Créer/modifier/désactiver un produit
//   - Créer/modifier/désactiver un article (sous son produit parent)
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
  createArticleAction,
  createProduitAction,
  toggleArticleAction,
  toggleProduitAction,
  updateArticleAction,
  updateProduitAction,
} from "../../_actions";
import type { ArticleClientDTO, ProduitClientDTO } from "./catalogues-types";

export interface CataloguesPanelProps {
  readonly produits: readonly ProduitClientDTO[];
  readonly articles: readonly ArticleClientDTO[];
}

type Dialog =
  | { kind: "none" }
  | { kind: "createProduit" }
  | { kind: "editProduit"; produit: ProduitClientDTO }
  | { kind: "createArticle"; produitId: number; produitNom: string }
  | { kind: "editArticle"; article: ArticleClientDTO };

export function CataloguesPanel(props: CataloguesPanelProps) {
  const t = useTranslations("settings.catalogues");
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });

  const articlesByProduit = new Map<number, ArticleClientDTO[]>();
  for (const a of props.articles) {
    const list = articlesByProduit.get(a.produitId) ?? [];
    list.push(a);
    articlesByProduit.set(a.produitId, list);
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-foreground text-xl">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setDialog({ kind: "createProduit" });
          }}
        >
          {t("createProduit")}
        </Button>
      </div>

      {props.produits.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">{t("emptyProduits")}</p>
      ) : (
        <div className="mt-6 space-y-6">
          {props.produits.map((p) => (
            <ProduitSection
              key={p.id}
              produit={p}
              articles={articlesByProduit.get(p.id) ?? []}
              onEditProduit={() => {
                setDialog({ kind: "editProduit", produit: p });
              }}
              onCreateArticle={() => {
                setDialog({ kind: "createArticle", produitId: p.id, produitNom: p.nom });
              }}
              onEditArticle={(article) => {
                setDialog({ kind: "editArticle", article });
              }}
            />
          ))}
        </div>
      )}

      <ProduitDialog
        state={dialog}
        onClose={() => {
          setDialog({ kind: "none" });
        }}
      />

      <ArticleDialog
        state={dialog}
        onClose={() => {
          setDialog({ kind: "none" });
        }}
      />
    </>
  );
}

function ProduitSection({
  produit,
  articles,
  onEditProduit,
  onCreateArticle,
  onEditArticle,
}: {
  readonly produit: ProduitClientDTO;
  readonly articles: readonly ArticleClientDTO[];
  readonly onEditProduit: () => void;
  readonly onCreateArticle: () => void;
  readonly onEditArticle: (a: ArticleClientDTO) => void;
}) {
  const t = useTranslations("settings.catalogues");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onToggle = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          await toggleProduitAction({ code: produit.code });
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
          <h2 className="font-display text-foreground text-base">
            {produit.nom}{" "}
            <span className="text-muted-foreground font-mono text-xs">({produit.code})</span>
            {!produit.actif && (
              <span className="bg-muted text-muted-foreground ml-2 rounded-full px-2 py-0.5 text-xs">
                {t("inactif")}
              </span>
            )}
          </h2>
          {produit.description !== null && (
            <p className="text-muted-foreground mt-1 text-sm">{produit.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCreateArticle}>
            {t("createArticle")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onEditProduit}>
            {t("editProduit")}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onToggle}>
            {produit.actif ? t("disable") : t("enable")}
          </Button>
        </div>
      </header>

      {error !== "" && <p className="text-destructive mt-2 text-xs">{error}</p>}

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.code")}</TableHead>
            <TableHead>{t("table.nom")}</TableHead>
            <TableHead>{t("table.unite")}</TableHead>
            <TableHead>{t("table.actif")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                {t("emptyArticles")}
              </TableCell>
            </TableRow>
          ) : (
            articles.map((a) => (
              <ArticleRow
                key={a.id}
                article={a}
                onEdit={() => {
                  onEditArticle(a);
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
  article,
  onEdit,
}: {
  readonly article: ArticleClientDTO;
  readonly onEdit: () => void;
}) {
  const t = useTranslations("settings.catalogues");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onToggle = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          await toggleArticleAction({ id: article.id });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{article.code}</TableCell>
      <TableCell className="text-sm">{article.nom}</TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {article.uniteVolume}
        {!article.controleVolume && (
          <span
            className="ml-2 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300"
            title="Phase 19 R-13 — volume non contrôlé (illimité)"
          >
            Illimité
          </span>
        )}
      </TableCell>
      <TableCell>
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs ${
            article.actif ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          {article.actif ? t("actif") : t("inactif")}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            {t("edit")}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onToggle}>
            {article.actif ? t("disable") : t("enable")}
          </Button>
        </div>
        {error !== "" && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </TableCell>
    </TableRow>
  );
}

function ProduitDialog({
  state,
  onClose,
}: {
  readonly state: Dialog;
  readonly onClose: () => void;
}) {
  const t = useTranslations("settings.catalogues.produitDialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  if (state.kind !== "createProduit" && state.kind !== "editProduit") return null;

  const isEdit = state.kind === "editProduit";
  const initial = isEdit ? state.produit : null;

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = strReq(fd.get("code"));
    const nom = strReq(fd.get("nom"));
    const descriptionRaw = strOpt(fd.get("description"));
    startTransition(() => {
      void (async () => {
        try {
          if (isEdit) {
            await updateProduitAction({
              code,
              nom,
              description: descriptionRaw ?? null,
            });
          } else {
            await createProduitAction({
              code,
              nom,
              ...(descriptionRaw !== undefined ? { description: descriptionRaw } : {}),
            });
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
          <DialogTitle>{isEdit ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="code">{t("code")}</Label>
            <Input
              id="code"
              name="code"
              maxLength={30}
              required
              readOnly={isEdit}
              defaultValue={initial?.code ?? ""}
              // Validation client identique au regex Zod côté serveur
              // (ProduitCodeSchema). Pattern HTML5 + auto-uppercase →
              // évite la propagation d'un ZodError opaque depuis la
              // Server Action quand l'utilisateur tape en minuscules.
              pattern="[A-Z][A-Z0-9_-]*"
              title="Majuscules, chiffres, tirets ou underscores. Doit commencer par une lettre."
              className="font-mono uppercase"
              onInput={
                isEdit
                  ? undefined
                  : (e) => {
                      e.currentTarget.value = e.currentTarget.value.toUpperCase();
                    }
              }
            />
            <p className="text-muted-foreground text-xs">
              Format : majuscules, chiffres, tirets ou underscores (ex : SPX-CORE).
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="nom">{t("nom")}</Label>
            <Input id="nom" name="nom" maxLength={200} required defaultValue={initial?.nom ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">{t("description")}</Label>
            <Input
              id="description"
              name="description"
              maxLength={1000}
              defaultValue={initial?.description ?? ""}
            />
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

function ArticleDialog({
  state,
  onClose,
}: {
  readonly state: Dialog;
  readonly onClose: () => void;
}) {
  const t = useTranslations("settings.catalogues.articleDialog");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  if (state.kind !== "createArticle" && state.kind !== "editArticle") return null;

  const isEdit = state.kind === "editArticle";
  const initial = isEdit ? state.article : null;
  const produitNom = state.kind === "createArticle" ? state.produitNom : null;
  const produitId = state.kind === "createArticle" ? state.produitId : null;

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = strReq(fd.get("code"));
    const nom = strReq(fd.get("nom"));
    const descriptionRaw = strOpt(fd.get("description"));
    const uniteVolume = strReq(fd.get("uniteVolume"));
    // Phase 19 R-13 — checkbox HTML "on" si cochée, absente sinon.
    const controleVolume = fd.get("controleVolume") === "on";
    startTransition(() => {
      void (async () => {
        try {
          if (isEdit && initial !== null) {
            await updateArticleAction({
              id: initial.id,
              nom,
              description: descriptionRaw ?? null,
              uniteVolume,
              controleVolume,
            });
          } else if (produitId !== null) {
            await createArticleAction({
              produitId,
              code,
              nom,
              uniteVolume,
              controleVolume,
              ...(descriptionRaw !== undefined ? { description: descriptionRaw } : {}),
            });
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
          <DialogTitle>
            {isEdit ? t("editTitle") : t("createTitle", { produit: produitNom ?? "" })}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="code">{t("code")}</Label>
            <Input
              id="code"
              name="code"
              maxLength={30}
              required
              readOnly={isEdit}
              defaultValue={initial?.code ?? ""}
              // Cohérent ProduitDialog : pattern HTML5 + auto-uppercase
              // alignés sur ProduitCodeSchema Zod côté serveur.
              pattern="[A-Z][A-Z0-9_-]*"
              title="Majuscules, chiffres, tirets ou underscores. Doit commencer par une lettre."
              className="font-mono uppercase"
              onInput={
                isEdit
                  ? undefined
                  : (e) => {
                      e.currentTarget.value = e.currentTarget.value.toUpperCase();
                    }
              }
            />
            <p className="text-muted-foreground text-xs">
              Format : majuscules, chiffres, tirets ou underscores (ex : KERNEL, ATM-STD).
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="nom">{t("nom")}</Label>
            <Input id="nom" name="nom" maxLength={200} required defaultValue={initial?.nom ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="uniteVolume">{t("uniteVolume")}</Label>
            <Input
              id="uniteVolume"
              name="uniteVolume"
              maxLength={30}
              required
              defaultValue={initial?.uniteVolume ?? "transactions"}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">{t("description")}</Label>
            <Input
              id="description"
              name="description"
              maxLength={1000}
              defaultValue={initial?.description ?? ""}
            />
          </div>
          {/* Phase 19 R-13 — toggle volume contrôlé / illimité. Default
              coché (true). Si décoché, le wizard ajout article à licence
              ne demandera pas le vol autorisé (Illimité affiché). */}
          <div className="flex items-start gap-2">
            <input
              id="controleVolume"
              name="controleVolume"
              type="checkbox"
              defaultChecked={initial?.controleVolume ?? true}
              className="mt-0.5 size-4"
            />
            <div className="space-y-0.5">
              <Label htmlFor="controleVolume">Contrôle de volume activé</Label>
              <p className="text-muted-foreground text-xs">
                Décocher si l&apos;article correspond à une fonctionnalité (ex : ATM-ADV) — les
                licences l&apos;utiliseront alors en volume illimité.
              </p>
            </div>
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

function strReq(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function strOpt(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length === 0 ? undefined : s;
}
