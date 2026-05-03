// ==============================================================================
// LIC v2 — Entité Setting (Phase 2.B étape 7/7)
//
// lic_settings est une table key-value JSONB technique : pas d'entité riche au
// sens DDD. La validation des valeurs est portée par les schémas Zod
// (shared/src/schemas/settings.schema.ts) — le domaine garantit uniquement
// que la clé est non vide. Pattern délibérément light, aligné R-27 (table
// technique excluse de l'audit obligatoire et de l'immutabilité métier).
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

const KEY_MAX_LEN = 100;
const KEY_REGEX = /^[a-z][a-z0-9_]*$/;

export interface SettingProps {
  readonly key: string;
  readonly value: unknown;
  readonly updatedAt: Date;
  readonly updatedBy: string | null;
}

export class Setting {
  readonly key: string;
  readonly value: unknown;
  readonly updatedAt: Date;
  readonly updatedBy: string | null;

  private constructor(props: SettingProps) {
    this.key = props.key;
    this.value = props.value;
    this.updatedAt = props.updatedAt;
    this.updatedBy = props.updatedBy;
  }

  static rehydrate(props: SettingProps): Setting {
    return new Setting(props);
  }

  static validateKey(key: string): void {
    if (typeof key !== "string" || key.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-901",
        message: "settings key must be a non-empty string",
      });
    }
    if (key.length > KEY_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-901",
        message: `settings key > ${String(KEY_MAX_LEN)} caractères`,
      });
    }
    if (!KEY_REGEX.test(key)) {
      throw new ValidationError({
        code: "SPX-LIC-901",
        message: `settings key "${key}" doit matcher /^[a-z][a-z0-9_]*$/`,
      });
    }
  }
}
