// LIC v2 — /history (Phase 17 S1) — redirect permanent vers /audit.
// L'item de nav unifié pointe désormais directement vers /audit. Le path
// /history est conservé temporairement pour les anciens bookmarks.

import { redirect } from "next/navigation";

export default function HistoryPage(): never {
  redirect("/audit");
}
