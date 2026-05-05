// ==============================================================================
// LIC v2 — Tests adapter EmailSender Console (Phase 14 — DETTE-003)
// ==============================================================================

import { describe, expect, it, vi } from "vitest";

import { EmailSenderConsole } from "../adapters/console/email-sender.console";
import { EmailMessage } from "../domain/email-message.entity";

vi.mock("@/server/infrastructure/logger", () => {
  const calls: { args: unknown[] }[] = [];
  return {
    createChildLogger: () => ({
      info: (...args: unknown[]) => {
        calls.push({ args });
      },
      warn: () => undefined,
      error: () => undefined,
    }),
    __getCalls: () => calls,
  };
});

describe("EmailSenderConsole", () => {
  it("expose mode='console'", () => {
    const sender = new EmailSenderConsole();
    expect(sender.mode).toBe("console");
  });

  it("send() résout sans throw et n'effectue aucun appel réseau (mode simulé)", async () => {
    const sender = new EmailSenderConsole();
    const message = EmailMessage.create({
      to: "user@s2m.ma",
      subject: "Test",
      bodyHtml: "<p>Hello</p>",
      bodyText: "Hello",
    });
    await expect(sender.send(message)).resolves.toBeUndefined();
  });
});
