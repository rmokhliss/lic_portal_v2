// ==============================================================================
// LIC v2 — Schémas Zod client (Phase 4 étape 4.B)
//
// Contrats UI ↔ serveur pour les Server Actions client. Validation strict
// (rejette les champs inconnus). Le matricule créateur (cree_par) est posé
// côté backend via session — pas dans le schéma d'entrée.
// ==============================================================================

import { z } from "zod";

const ClientStatutSchema = z.enum(["PROSPECT", "ACTIF", "SUSPENDU", "RESILIE"]);

// ISO date YYYY-MM-DD pour les date pures (pas timestamp). Zod parse string,
// le repo convertit en Date ou laisse tel quel selon Drizzle.
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "format YYYY-MM-DD");

/** Phase 14 — DETTE-LIC-017 résolue : contact saisi à la création client.
 *  Les contacts sont attachés à l'entité « Siège » créée en même temps.
 *  Max 5 contacts par création (UI cap — règle ergonomique). */
export const ContactInputSchema = z
  .object({
    typeContactCode: z.string().min(1).max(30),
    nom: z.string().min(1).max(100),
    prenom: z.string().min(1).max(100).optional(),
    email: z.email().max(200).optional(),
    telephone: z.string().min(1).max(20).optional(),
  })
  .strict();

export type ContactInput = z.infer<typeof ContactInputSchema>;

export const CreateClientSchema = z
  .object({
    codeClient: z
      .string()
      .min(2)
      .max(20)
      .regex(/^[A-Z0-9_-]+$/, "code client UPPERCASE alphanumérique"),
    raisonSociale: z.string().min(1).max(200),
    nomContact: z.string().min(1).max(100).optional(),
    emailContact: z.email().max(200).optional(),
    telContact: z.string().min(1).max(20).optional(),
    codePays: z.string().length(2).optional(),
    codeDevise: z.string().min(3).max(10).optional(),
    codeLangue: z.string().min(2).max(5).optional(),
    salesResponsable: z.string().min(1).max(100).optional(),
    accountManager: z.string().min(1).max(100).optional(),
    statutClient: ClientStatutSchema.optional(),
    dateSignatureContrat: IsoDateSchema.optional(),
    dateMiseEnProd: IsoDateSchema.optional(),
    dateDemarrageSupport: IsoDateSchema.optional(),
    prochaineDateRenouvellementSupport: IsoDateSchema.optional(),
    /** Nom de l'entité « Siège » créée dans la même transaction. Default
     *  = raisonSociale (cohérent règle métier : 1 client = au moins 1 entité). */
    siegeNom: z.string().min(1).max(200).optional(),
    /** Phase 14 — DETTE-LIC-017 : contacts attachés à l'entité Siège dans
     *  la même transaction que la création client. Max 5 (UI cap). */
    contacts: z.array(ContactInputSchema).max(5).optional(),
  })
  .strict();

export type CreateClientInput = z.infer<typeof CreateClientSchema>;

export const UpdateClientSchema = z
  .object({
    clientId: z.uuid(),
    /** Optimistic locking : la version BD courante du client (règle L4). */
    expectedVersion: z.number().int().min(0),
    raisonSociale: z.string().min(1).max(200).optional(),
    nomContact: z.string().max(100).optional(),
    emailContact: z.email().max(200).optional().or(z.literal("")),
    telContact: z.string().max(20).optional(),
    codePays: z.string().length(2).optional(),
    codeDevise: z.string().min(3).max(10).optional(),
    codeLangue: z.string().min(2).max(5).optional(),
    salesResponsable: z.string().max(100).optional(),
    accountManager: z.string().max(100).optional(),
    dateSignatureContrat: IsoDateSchema.optional(),
    dateMiseEnProd: IsoDateSchema.optional(),
    dateDemarrageSupport: IsoDateSchema.optional(),
    prochaineDateRenouvellementSupport: IsoDateSchema.optional(),
  })
  .strict();

export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;

export const ChangeClientStatusSchema = z
  .object({
    clientId: z.uuid(),
    expectedVersion: z.number().int().min(0),
    newStatus: ClientStatutSchema,
  })
  .strict();

export type ChangeClientStatusInput = z.infer<typeof ChangeClientStatusSchema>;

export type ClientStatutInput = z.infer<typeof ClientStatutSchema>;
