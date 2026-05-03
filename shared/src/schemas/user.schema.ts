// ==============================================================================
// LIC v2 — Schémas Zod user EC-08 (Phase 2.B.bis)
//
// Validation des Server Actions create / update.
// Toggle et reset prennent juste { userId } et n'ont pas besoin de schéma
// dédié partagé — validés inline dans _actions.ts.
// ==============================================================================

import { z } from "zod";

const UserRoleSchema = z.enum(["SADMIN", "ADMIN", "USER"]);

export const CreateUserSchema = z
  .object({
    matricule: z
      .string()
      .min(1)
      .max(20)
      .regex(/^MAT-\d{3,}$/, "matricule doit matcher MAT-NNN (3+ chiffres)"),
    nom: z.string().min(1).max(100),
    prenom: z.string().min(1).max(100),
    email: z.email().max(200),
    role: UserRoleSchema,
    telephone: z.string().min(1).max(20).optional(),
  })
  .strict();

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z
  .object({
    userId: z.uuid(),
    nom: z.string().min(1).max(100).optional(),
    prenom: z.string().min(1).max(100).optional(),
    role: UserRoleSchema.optional(),
  })
  .strict();

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export type UserRoleInput = z.infer<typeof UserRoleSchema>;
