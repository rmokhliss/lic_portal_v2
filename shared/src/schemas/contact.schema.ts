// ==============================================================================
// LIC v2 — Schémas Zod contact (Phase 4 étape 4.C)
// ==============================================================================

import { z } from "zod";

export const CreateContactSchema = z
  .object({
    entiteId: z.uuid(),
    typeContactCode: z.string().min(1).max(30),
    nom: z.string().min(1).max(100),
    prenom: z.string().min(1).max(100).optional(),
    email: z.email().max(200).optional(),
    telephone: z.string().min(1).max(20).optional(),
  })
  .strict();

export type CreateContactInput = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = z
  .object({
    contactId: z.uuid(),
    typeContactCode: z.string().min(1).max(30).optional(),
    nom: z.string().min(1).max(100).optional(),
    prenom: z.string().max(100).optional(),
    email: z.email().max(200).optional().or(z.literal("")),
    telephone: z.string().max(20).optional(),
  })
  .strict();

export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;

export const DeleteContactSchema = z
  .object({
    contactId: z.uuid(),
  })
  .strict();

export type DeleteContactInput = z.infer<typeof DeleteContactSchema>;
