// ==============================================================================
// LIC v2 — Schémas Zod entite (Phase 4 étape 4.C)
// ==============================================================================

import { z } from "zod";

export const CreateEntiteSchema = z
  .object({
    clientId: z.uuid(),
    nom: z.string().min(1).max(200),
    codePays: z.string().length(2).optional(),
  })
  .strict();

export type CreateEntiteInput = z.infer<typeof CreateEntiteSchema>;

export const UpdateEntiteSchema = z
  .object({
    entiteId: z.uuid(),
    nom: z.string().min(1).max(200).optional(),
    codePays: z.string().length(2).optional(),
  })
  .strict();

export type UpdateEntiteInput = z.infer<typeof UpdateEntiteSchema>;

export const ToggleEntiteActiveSchema = z
  .object({
    entiteId: z.uuid(),
  })
  .strict();

export type ToggleEntiteActiveInput = z.infer<typeof ToggleEntiteActiveSchema>;
