// ==============================================================================
// LIC v2 — Tests SendEmailUseCase (Phase 14 — DETTE-003)
// ==============================================================================

import { describe, expect, it, vi } from "vitest";

import type { EmailMessage } from "../domain/email-message.entity";
import type { EmailSender } from "../ports/email-sender";
import { SendEmailUseCase } from "../application/send-email.usecase";

class FakeSender implements EmailSender {
  readonly mode = "console" as const;
  readonly received: EmailMessage[] = [];
  send = vi.fn((message: EmailMessage) => {
    this.received.push(message);
    return Promise.resolve();
  });
}

describe("SendEmailUseCase", () => {
  it("valide le message via EmailMessage.create + délègue à l'adapter", async () => {
    const sender = new FakeSender();
    const useCase = new SendEmailUseCase(sender);

    await useCase.execute({
      to: "user@s2m.ma",
      subject: "Bienvenue",
      bodyHtml: "<p>Hi</p>",
      bodyText: "Hi",
    });

    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(sender.received[0]?.to).toBe("user@s2m.ma");
    expect(sender.received[0]?.subject).toBe("Bienvenue");
  });

  it("throw SPX-LIC-801 si email destinataire invalide (pas appelé l'adapter)", async () => {
    const sender = new FakeSender();
    const useCase = new SendEmailUseCase(sender);

    await expect(
      useCase.execute({
        to: "not-an-email",
        subject: "Test",
        bodyHtml: "<p>Hi</p>",
        bodyText: "Hi",
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-801" });

    expect(sender.send).not.toHaveBeenCalled();
  });

  it("throw SPX-LIC-801 si sujet vide", async () => {
    const sender = new FakeSender();
    const useCase = new SendEmailUseCase(sender);

    await expect(
      useCase.execute({
        to: "user@s2m.ma",
        subject: "",
        bodyHtml: "<p>Hi</p>",
        bodyText: "Hi",
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-801" });
  });
});
