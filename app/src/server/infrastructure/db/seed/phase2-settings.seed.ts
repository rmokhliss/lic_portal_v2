// ==============================================================================
// LIC v2 — Seed Phase 2.B — settings par défaut (Phase 23 R-42)
//
// Garantit la présence des 5 clés critiques alimentant /settings/general
// (`SettingsGeneralForm.tsx`). Auparavant logé dans `runSeed()` de seed.ts ;
// extrait ici pour pouvoir être également câblé dans `reload-demo.ts` (afin
// que reset démo ré-amorce les settings si purge ou BD reset).
//
// Idempotent : ON CONFLICT (key) DO NOTHING. Ne touche pas aux clés déjà
// présentes (s2m_root_ca, healthcheck_*aes_key, etc.).
//
// Clés alignées au code applicatif :
//   - app/src/app/(dashboard)/settings/general/page.tsx
//   - app/src/app/(dashboard)/settings/_components/SettingsGeneralForm.tsx
// ==============================================================================

import type postgres from "postgres";

// Phase 24 — inlined depuis @s2m-lic/shared/constants/system-user pour
// rompre la dépendance cross-workspace dans les seeds (les images Docker
// de migration n'embarquent pas le workspace shared).
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

import { createChildLogger } from "@/server/infrastructure/logger";

import { generateAes256Key } from "@/server/modules/crypto/domain/aes";

const log = createChildLogger("db/seed/phase2-settings");

interface SettingSeed {
  readonly key: string;
  readonly value: unknown;
}

const DEFAULT_SETTINGS: readonly SettingSeed[] = [
  { key: "seuil_alerte_defaut", value: 80 },
  { key: "tolerance_volume_pct", value: 5 },
  { key: "tolerance_date_jours", value: 30 },
  { key: "warning_volume_pct", value: 80 },
  { key: "warning_date_jours", value: 60 },
  { key: "healthcheck_shared_aes_key", value: generateAes256Key() },
];

export async function seedDefaultSettings(sql: postgres.Sql): Promise<void> {
  log.info({ count: DEFAULT_SETTINGS.length }, "Seeding lic_settings (defaults Phase 23 R-42)");

  for (const s of DEFAULT_SETTINGS) {
    const jsonValue = JSON.stringify(s.value);
    await sql`
      INSERT INTO lic_settings (key, value, updated_by)
      VALUES (${s.key}, ${jsonValue}::jsonb, ${SYSTEM_USER_ID}::uuid)
      ON CONFLICT (key) DO NOTHING
    `;
  }
}
