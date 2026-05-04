// ==============================================================================
// LIC v2 — Tests d'intégration notification use-cases (Phase 8.B)
// Pas d'audit transactionnel sur les use-cases notification — TRUNCATE+reseed
// pour partir d'un état propre.
// ==============================================================================

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

vi.mock("server-only", () => ({}));

import "../../../../../scripts/load-env";

import postgres from "postgres";

import { NotificationRepositoryPg } from "../adapters/postgres/notification.repository.pg";
import { CreateNotificationUseCase } from "../application/create-notification.usecase";
import { ListNotificationsUseCase } from "../application/list-notifications.usecase";
import { MarkAllNotificationsReadUseCase } from "../application/mark-all-notifications-read.usecase";
import { MarkNotificationReadUseCase } from "../application/mark-notification-read.usecase";

const USER_A = "01928c8e-aaaa-bbbb-cccc-dddd00000001";
const USER_B = "01928c8e-aaaa-bbbb-cccc-dddd00000002";

let sql: postgres.Sql;
let create: CreateNotificationUseCase;
let list: ListNotificationsUseCase;
let markRead: MarkNotificationReadUseCase;
let markAllRead: MarkAllNotificationsReadUseCase;
let repo: NotificationRepositoryPg;

beforeAll(() => {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === "") {
    // eslint-disable-next-line no-restricted-syntax -- pré-condition test
    throw new Error("DATABASE_URL absent");
  }
  sql = postgres(url, { max: 1 });
  repo = new NotificationRepositoryPg();
  create = new CreateNotificationUseCase(repo);
  list = new ListNotificationsUseCase(repo);
  markRead = new MarkNotificationReadUseCase(repo);
  markAllRead = new MarkAllNotificationsReadUseCase(repo);
});

beforeEach(async () => {
  // beforeEach (vs afterEach SYS-000 only) car les tests requièrent USER_A
  // et USER_B dès le 1er test — pas de chemin reseed en amont.
  await sql`TRUNCATE TABLE lic_notifications, lic_users CASCADE`;
  await sql`
    INSERT INTO lic_users (id, matricule, nom, prenom, email, password_hash,
      must_change_password, role, actif, created_at, updated_at)
    VALUES
      (${SYSTEM_USER_ID}, 'SYS-000', 'SYSTEM', 'Système', 'system@s2m.local',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'SADMIN', false, NOW(), NOW()),
      (${USER_A}, 'MAT-A', 'USERA', 'Alice', 'a@s2m.ma',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'ADMIN', true, NOW(), NOW()),
      (${USER_B}, 'MAT-B', 'USERB', 'Bob', 'b@s2m.ma',
       '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
       false, 'USER', true, NOW(), NOW())
  `;
});

afterAll(async () => {
  // Nettoyage final pour ne pas polluer les autres fichiers de tests.
  await sql`TRUNCATE TABLE lic_notifications, lic_users CASCADE`;
  await sql.end();
});

describe("Notification use-cases", () => {
  it("create + list retourne la notif non lue", async () => {
    const dto = await create.execute({
      userId: USER_A,
      title: "Hello",
      body: "First notif",
      source: "TEST",
    });
    expect(dto.read).toBe(false);

    const page = await list.execute({ userId: USER_A });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe(dto.id);
    expect(page.unreadCount).toBe(1);
  });

  it("markRead par owner OK + countUnread décrémente", async () => {
    const created = await create.execute({
      userId: USER_A,
      title: "Read me",
      body: "x",
      source: "TEST",
    });

    expect(await repo.countUnread(USER_A)).toBe(1);

    await markRead.execute({ id: created.id }, USER_A);

    expect(await repo.countUnread(USER_A)).toBe(0);
  });

  it("markRead par autre user — SPX-LIC-760 ForbiddenError", async () => {
    const created = await create.execute({
      userId: USER_A,
      title: "Mine",
      body: "x",
      source: "TEST",
    });

    await expect(markRead.execute({ id: created.id }, USER_B)).rejects.toMatchObject({
      code: "SPX-LIC-760",
    });
  });

  it("countUnread + markAllRead remet le compteur à 0", async () => {
    await create.execute({ userId: USER_A, title: "1", body: "x", source: "T" });
    await create.execute({ userId: USER_A, title: "2", body: "x", source: "T" });
    await create.execute({ userId: USER_A, title: "3", body: "x", source: "T" });
    await create.execute({ userId: USER_B, title: "B", body: "x", source: "T" }); // user B ne doit pas être touché

    expect(await repo.countUnread(USER_A)).toBe(3);
    expect(await repo.countUnread(USER_B)).toBe(1);

    const result = await markAllRead.execute(USER_A);
    expect(result.marked).toBe(3);
    expect(await repo.countUnread(USER_A)).toBe(0);
    expect(await repo.countUnread(USER_B)).toBe(1);
  });
});
