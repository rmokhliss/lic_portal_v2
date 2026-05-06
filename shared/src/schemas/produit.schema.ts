// ==============================================================================
// LIC v2 — Schémas Zod produit + article (Phase 6)
// ==============================================================================

import { z } from "zod";

const ProduitCodeSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[A-Z][A-Z0-9_-]*$/, {
    message:
      "Le code doit commencer par une lettre majuscule et ne contenir que des majuscules, chiffres, tirets ou underscores (ex : SPX-CORE, KERNEL).",
  });

export const CreateProduitSchema = z
  .object({
    code: ProduitCodeSchema,
    nom: z.string().min(1).max(200),
    description: z.string().min(1).max(1000).optional(),
    actif: z.boolean().optional(),
  })
  .strict();

export type CreateProduitInput = z.infer<typeof CreateProduitSchema>;

export const UpdateProduitSchema = z
  .object({
    code: ProduitCodeSchema,
    nom: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
  })
  .strict();

export type UpdateProduitInput = z.infer<typeof UpdateProduitSchema>;

export const ToggleProduitSchema = z.object({ code: ProduitCodeSchema }).strict();

export type ToggleProduitInput = z.infer<typeof ToggleProduitSchema>;

// --- Articles ---------------------------------------------------------------

export const CreateArticleSchema = z
  .object({
    produitId: z.number().int().positive(),
    code: ProduitCodeSchema,
    nom: z.string().min(1).max(200),
    description: z.string().min(1).max(1000).optional(),
    uniteVolume: z.string().min(1).max(30).optional(),
    actif: z.boolean().optional(),
    /** Phase 19 R-13 — défaut true côté entité Article. */
    controleVolume: z.boolean().optional(),
  })
  .strict();

export type CreateArticleInput = z.infer<typeof CreateArticleSchema>;

export const UpdateArticleSchema = z
  .object({
    id: z.number().int().positive(),
    nom: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    uniteVolume: z.string().min(1).max(30).optional(),
    /** Phase 19 R-13 — toggle volume contrôlé / illimité. */
    controleVolume: z.boolean().optional(),
  })
  .strict();

export type UpdateArticleInput = z.infer<typeof UpdateArticleSchema>;

export const ToggleArticleSchema = z.object({ id: z.number().int().positive() }).strict();

export type ToggleArticleInput = z.infer<typeof ToggleArticleSchema>;

// --- Liaisons licence-produit / licence-article -----------------------------

export const AddProduitToLicenceSchema = z
  .object({
    licenceId: z.uuid(),
    produitId: z.number().int().positive(),
  })
  .strict();

export type AddProduitToLicenceInput = z.infer<typeof AddProduitToLicenceSchema>;

export const RemoveLiaisonSchema = z.object({ id: z.uuid() }).strict();

export type RemoveLiaisonInput = z.infer<typeof RemoveLiaisonSchema>;

export const AddArticleToLicenceSchema = z
  .object({
    licenceId: z.uuid(),
    articleId: z.number().int().positive(),
    volumeAutorise: z.number().int().nonnegative(),
    volumeConsomme: z.number().int().nonnegative().optional(),
  })
  .strict();

export type AddArticleToLicenceInput = z.infer<typeof AddArticleToLicenceSchema>;

export const UpdateArticleVolumeSchema = z
  .object({
    id: z.uuid(),
    volumeAutorise: z.number().int().nonnegative().optional(),
    volumeConsomme: z.number().int().nonnegative().optional(),
  })
  .strict();

export type UpdateArticleVolumeInput = z.infer<typeof UpdateArticleVolumeSchema>;
