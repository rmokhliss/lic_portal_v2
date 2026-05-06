// ==============================================================================
// LIC v2 — Server Actions /alerts (Phase 17 S4)
//
// CRUD alert-configs cross-clients. requireRolePage(["ADMIN", "SADMIN"])
// (l'item de nav est déjà filtré minRole=ADMIN dans nav-routes.ts).
// Audit transactionnel L3 délégué aux use-cases.
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import {
  createAlertConfigUseCase,
  deleteAlertConfigUseCase,
  updateAlertConfigUseCase,
} from "@/server/composition-root";

const ChannelSchema = z.enum(["IN_APP", "EMAIL", "SMS"]);

const CreateSchema = z
  .object({
    clientId: z.uuid(),
    libelle: z.string().min(1).max(200),
    canaux: z.array(ChannelSchema).min(1),
    seuilVolumePct: z.number().int().positive().max(200).nullable().optional(),
    seuilDateJours: z.number().int().positive().nullable().optional(),
    actif: z.boolean().optional(),
  })
  .strict();

const UpdateSchema = z
  .object({
    id: z.uuid(),
    libelle: z.string().min(1).max(200).optional(),
    canaux: z.array(ChannelSchema).min(1).optional(),
    seuilVolumePct: z.number().int().positive().max(200).nullable().optional(),
    seuilDateJours: z.number().int().positive().nullable().optional(),
    actif: z.boolean().optional(),
  })
  .strict();

const DeleteSchema = z.object({ id: z.uuid() }).strict();

export async function createAlertConfigAction(input: unknown): Promise<void> {
  const user = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = CreateSchema.parse(input);
  await createAlertConfigUseCase.execute(parsed, user.id);
  revalidatePath("/alerts");
}

export async function updateAlertConfigAction(input: unknown): Promise<void> {
  const user = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = UpdateSchema.parse(input);
  await updateAlertConfigUseCase.execute(parsed, user.id);
  revalidatePath("/alerts");
}

export async function deleteAlertConfigAction(input: unknown): Promise<void> {
  const user = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = DeleteSchema.parse(input);
  await deleteAlertConfigUseCase.execute({ id: parsed.id }, user.id);
  revalidatePath("/alerts");
}
