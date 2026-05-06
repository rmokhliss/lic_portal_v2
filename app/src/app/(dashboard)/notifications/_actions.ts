// ==============================================================================
// LIC v2 — Server Actions /notifications (Phase 8.D + Phase 18 R-16)
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthPage, requireRole } from "@/server/infrastructure/auth";
import {
  deleteOldNotificationsUseCase,
  listNotificationsUseCase,
  markAllNotificationsReadUseCase,
  markNotificationReadUseCase,
} from "@/server/composition-root";

const FetchNotificationsSchema = z
  .object({
    cursor: z.string().max(200).optional(),
    onlyUnread: z.boolean().optional(),
  })
  .strict();

export async function fetchMyNotificationsAction(input: unknown) {
  const user = await requireAuthPage();
  const parsed = FetchNotificationsSchema.parse(input);
  return listNotificationsUseCase.execute({
    userId: user.id,
    ...(parsed.cursor !== undefined ? { cursor: parsed.cursor } : {}),
    ...(parsed.onlyUnread !== undefined ? { onlyUnread: parsed.onlyUnread } : {}),
    limit: 50,
  });
}

const NotifIdSchema = z.object({ id: z.uuid() }).strict();

export async function markNotificationReadAction(input: unknown) {
  const user = await requireAuthPage();
  const parsed = NotifIdSchema.parse(input);
  await markNotificationReadUseCase.execute(parsed, user.id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await requireAuthPage();
  const result = await markAllNotificationsReadUseCase.execute(user.id);
  revalidatePath("/notifications");
  return result;
}

/** Phase 18 R-16 — supprime les notifications LUES de plus de N jours.
 *  Réservé ADMIN/SADMIN (action de maintenance) — pas un bouton USER. */
const ArchiveSchema = z.object({ daysOld: z.int().positive().max(365).optional() }).strict();

export async function archiveOldNotificationsAction(
  input: unknown = {},
): Promise<{ deleted: number }> {
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ArchiveSchema.parse(input);
  const result = await deleteOldNotificationsUseCase.execute({
    daysOld: parsed.daysOld ?? 30,
  });
  revalidatePath("/notifications");
  return result;
}
