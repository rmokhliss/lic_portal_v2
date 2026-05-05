// ==============================================================================
// LIC v2 — Server Actions /settings/smtp (Phase 14 — DETTE-003)
// ==============================================================================

"use server";

import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import { renderTemplateUseCase, sendEmailUseCase } from "@/server/composition-root";
import { env } from "@/server/infrastructure/env";

const TestEmailSchema = z.object({ to: z.email() });

export interface TestEmailResult {
  readonly mode: "smtp" | "console";
  readonly delivered: boolean;
}

export async function testEmailAction(input: unknown): Promise<TestEmailResult> {
  const actor = await requireRole(["SADMIN"]);
  const parsed = TestEmailSchema.parse(input);
  const rendered = renderTemplateUseCase.execute("password-changed", {
    prenom: actor.prenom,
  });
  await sendEmailUseCase.execute({
    to: parsed.to,
    subject: `[Test SMTP] ${rendered.subject}`,
    bodyHtml: rendered.html,
    bodyText: rendered.text,
  });
  return {
    mode: env.SMTP_HOST !== undefined && env.SMTP_HOST.length > 0 ? "smtp" : "console",
    delivered: true,
  };
}
