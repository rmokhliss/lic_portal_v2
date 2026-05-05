// ==============================================================================
// LIC v2 — Tests adapter TemplateRendererMjml (Phase 14 — DETTE-003)
// ==============================================================================

import { describe, expect, it } from "vitest";

import { TemplateRendererMjml } from "../adapters/mjml/template-renderer.mjml";

describe("TemplateRendererMjml", () => {
  it("compile MJML → HTML et substitue {{var}} (template password-reset)", () => {
    const renderer = new TemplateRendererMjml();
    const result = renderer.render("password-reset", {
      prenom: "Karim",
      motDePasseTemp: "Temp-2026!",
      urlConnexion: "https://lic.s2m.ma/login",
    });

    expect(result.subject).toContain("mot de passe");
    expect(result.html.length).toBeGreaterThan(100);
    expect(result.html).toContain("Karim");
    expect(result.html).toContain("Temp-2026!");
    expect(result.text).toContain("Karim");
    expect(result.text).toContain("Temp-2026!");
  });

  it("rend tous les templates connus sans erreur MJML", () => {
    const renderer = new TemplateRendererMjml();
    const templates = [
      "password-reset",
      "password-changed",
      "user-welcome",
      "licence-expiring",
      "volume-threshold",
    ] as const;
    for (const t of templates) {
      const result = renderer.render(t, {
        prenom: "Test",
        email: "test@s2m.ma",
        motDePasseTemp: "x",
        motDePasseInitial: "y",
        urlConnexion: "https://lic.s2m.ma",
        reference: "LIC-2026-001",
        dateFin: "2026-12-31",
        joursRestants: 30,
        articleCode: "USERS",
        pourcentage: 85,
        urlLicence: "https://lic.s2m.ma/licences/x",
      });
      expect(result.html.length).toBeGreaterThan(50);
      expect(result.subject.length).toBeGreaterThan(0);
    }
  });
});
