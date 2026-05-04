// ==============================================================================
// LIC v2 — Server Actions /notifications (Phase 8.D)
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthPage } from "@/server/infrastructure/auth";
import {
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
