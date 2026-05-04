// ==============================================================================
// LIC v2 — Schémas Zod renouvellement (Phase 5)
// ==============================================================================

import { z } from "zod";

export const RenewStatusSchema = z.enum(["EN_COURS", "VALIDE", "CREE", "ANNULE"]);
const IsoDateTimeSchema = z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), {
  message: "ISO date string invalide",
});

export const CreateRenouvellementSchema = z
  .object({
    licenceId: z.uuid(),
    nouvelleDateDebut: IsoDateTimeSchema,
    nouvelleDateFin: IsoDateTimeSchema,
    commentaire: z.string().max(1000).optional(),
  })
  .strict()
  .refine((d) => new Date(d.nouvelleDateFin).getTime() > new Date(d.nouvelleDateDebut).getTime(), {
    message: "nouvelleDateFin doit être postérieure à nouvelleDateDebut",
    path: ["nouvelleDateFin"],
  });

export type CreateRenouvellementInput = z.infer<typeof CreateRenouvellementSchema>;

export const ValiderRenouvellementSchema = z.object({ renouvellementId: z.uuid() }).strict();
export type ValiderRenouvellementInput = z.infer<typeof ValiderRenouvellementSchema>;

export const AnnulerRenouvellementSchema = z
  .object({
    renouvellementId: z.uuid(),
    motif: z.string().max(500).optional(),
  })
  .strict();
export type AnnulerRenouvellementInput = z.infer<typeof AnnulerRenouvellementSchema>;

export const UpdateRenouvellementSchema = z
  .object({
    renouvellementId: z.uuid(),
    nouvelleDateDebut: IsoDateTimeSchema.optional(),
    nouvelleDateFin: IsoDateTimeSchema.optional(),
    commentaire: z.string().max(1000).nullable().optional(),
  })
  .strict()
  .refine(
    (d) => {
      if (d.nouvelleDateDebut !== undefined && d.nouvelleDateFin !== undefined) {
        return new Date(d.nouvelleDateFin).getTime() > new Date(d.nouvelleDateDebut).getTime();
      }
      return true;
    },
    {
      message: "nouvelleDateFin doit être postérieure à nouvelleDateDebut",
      path: ["nouvelleDateFin"],
    },
  );
export type UpdateRenouvellementInput = z.infer<typeof UpdateRenouvellementSchema>;

export type RenewStatusInput = z.infer<typeof RenewStatusSchema>;
