// ==============================================================================
// LIC v2 — Schémas Zod licence (Phase 5)
// ==============================================================================

import { z } from "zod";

const LicenceStatusSchema = z.enum(["ACTIF", "INACTIF", "SUSPENDU", "EXPIRE"]);

// ISO datetime string (ex: "2026-01-15T00:00:00.000Z" ou "2026-01-15"). Le
// repo convertit en Date Postgres TIMESTAMPTZ.
const IsoDateTimeSchema = z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), {
  message: "ISO date string invalide",
});

export const CreateLicenceSchema = z
  .object({
    clientId: z.uuid(),
    entiteId: z.uuid(),
    dateDebut: IsoDateTimeSchema,
    dateFin: IsoDateTimeSchema,
    commentaire: z.string().max(1000).optional(),
    renouvellementAuto: z.boolean().optional(),
  })
  .strict()
  .refine((d) => new Date(d.dateFin).getTime() > new Date(d.dateDebut).getTime(), {
    message: "dateFin doit être postérieure à dateDebut",
    path: ["dateFin"],
  });

export type CreateLicenceInput = z.infer<typeof CreateLicenceSchema>;

export const UpdateLicenceSchema = z
  .object({
    licenceId: z.uuid(),
    expectedVersion: z.number().int().min(0),
    dateDebut: IsoDateTimeSchema.optional(),
    dateFin: IsoDateTimeSchema.optional(),
    commentaire: z.string().max(1000).optional(),
    renouvellementAuto: z.boolean().optional(),
  })
  .strict();

export type UpdateLicenceInput = z.infer<typeof UpdateLicenceSchema>;

export const ChangeLicenceStatusSchema = z
  .object({
    licenceId: z.uuid(),
    expectedVersion: z.number().int().min(0),
    newStatus: LicenceStatusSchema,
  })
  .strict();

export type ChangeLicenceStatusInput = z.infer<typeof ChangeLicenceStatusSchema>;

export type LicenceStatusInput = z.infer<typeof LicenceStatusSchema>;
