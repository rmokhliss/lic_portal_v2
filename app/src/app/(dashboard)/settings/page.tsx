// LIC v2 — /settings (racine) : redirige vers /settings/general (Phase 2.B étape 6/7)

import { redirect } from "next/navigation";

export default function SettingsRootPage(): never {
  redirect("/settings/general");
}
