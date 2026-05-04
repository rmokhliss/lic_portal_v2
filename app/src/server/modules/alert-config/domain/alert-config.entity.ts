// ==============================================================================
// LIC v2 — Entité AlertConfig (Phase 8 étape 8.B)
//
// Configuration d'alerte attachée à un client. Au moins un des deux seuils
// (volume ou date) doit être défini (SPX-LIC-758). Au moins un canal.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

export type AlertChannel = "IN_APP" | "EMAIL" | "SMS";

const VALID_CHANNELS: ReadonlySet<AlertChannel> = new Set(["IN_APP", "EMAIL", "SMS"]);

export interface CreateAlertConfigInput {
  readonly clientId: string;
  readonly libelle: string;
  readonly canaux?: readonly AlertChannel[];
  readonly seuilVolumePct?: number | null;
  readonly seuilDateJours?: number | null;
  readonly actif?: boolean;
}

export interface RehydrateAlertConfigProps {
  readonly id: string;
  readonly clientId: string;
  readonly libelle: string;
  readonly canaux: readonly AlertChannel[];
  readonly seuilVolumePct: number | null;
  readonly seuilDateJours: number | null;
  readonly actif: boolean;
  readonly creePar: string | null;
  readonly modifiePar: string | null;
}

interface Props {
  readonly clientId: string;
  readonly libelle: string;
  readonly canaux: readonly AlertChannel[];
  readonly seuilVolumePct: number | null;
  readonly seuilDateJours: number | null;
  readonly actif: boolean;
}

export class AlertConfig {
  readonly clientId: string;
  readonly libelle: string;
  readonly canaux: readonly AlertChannel[];
  readonly seuilVolumePct: number | null;
  readonly seuilDateJours: number | null;
  readonly actif: boolean;

  protected constructor(props: Props) {
    this.clientId = props.clientId;
    this.libelle = props.libelle;
    this.canaux = props.canaux;
    this.seuilVolumePct = props.seuilVolumePct;
    this.seuilDateJours = props.seuilDateJours;
    this.actif = props.actif;
  }

  static create(input: CreateAlertConfigInput): AlertConfig {
    AlertConfig.validateLibelle(input.libelle);
    const canaux = input.canaux ?? ["IN_APP"];
    AlertConfig.validateCanaux(canaux);
    AlertConfig.validateSeuils(input.seuilVolumePct ?? null, input.seuilDateJours ?? null);
    return new AlertConfig({
      clientId: input.clientId,
      libelle: input.libelle,
      canaux,
      seuilVolumePct: input.seuilVolumePct ?? null,
      seuilDateJours: input.seuilDateJours ?? null,
      actif: input.actif ?? true,
    });
  }

  static rehydrate(props: RehydrateAlertConfigProps): PersistedAlertConfig {
    return new PersistedAlertConfig(
      {
        clientId: props.clientId,
        libelle: props.libelle,
        canaux: props.canaux,
        seuilVolumePct: props.seuilVolumePct,
        seuilDateJours: props.seuilDateJours,
        actif: props.actif,
      },
      props.id,
      props.creePar,
      props.modifiePar,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      clientId: this.clientId,
      libelle: this.libelle,
      canaux: [...this.canaux],
      seuilVolumePct: this.seuilVolumePct,
      seuilDateJours: this.seuilDateJours,
      actif: this.actif,
    };
  }

  static validateLibelle(libelle: string): void {
    if (typeof libelle !== "string" || libelle.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-757",
        message: "libellé obligatoire (non vide)",
      });
    }
    if (libelle.length > 200) {
      throw new ValidationError({
        code: "SPX-LIC-757",
        message: "libellé > 200 caractères",
      });
    }
  }

  static validateCanaux(canaux: readonly AlertChannel[]): void {
    if (canaux.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-757",
        message: "au moins un canal requis",
      });
    }
    for (const c of canaux) {
      if (!VALID_CHANNELS.has(c)) {
        throw new ValidationError({
          code: "SPX-LIC-757",
          message: `canal "${c}" inconnu (IN_APP/EMAIL/SMS)`,
        });
      }
    }
  }

  static validateSeuils(volumePct: number | null, dateJours: number | null): void {
    if (volumePct === null && dateJours === null) {
      throw new ValidationError({
        code: "SPX-LIC-758",
        message: "au moins un seuil (volume ou date) requis",
      });
    }
    if (volumePct !== null && (!Number.isInteger(volumePct) || volumePct <= 0 || volumePct > 200)) {
      throw new ValidationError({
        code: "SPX-LIC-757",
        message: "seuilVolumePct doit être entier dans (0, 200]",
      });
    }
    if (dateJours !== null && (!Number.isInteger(dateJours) || dateJours <= 0)) {
      throw new ValidationError({
        code: "SPX-LIC-757",
        message: "seuilDateJours doit être entier > 0",
      });
    }
  }
}

export class PersistedAlertConfig extends AlertConfig {
  readonly id: string;
  readonly creePar: string | null;
  readonly modifiePar: string | null;

  constructor(props: Props, id: string, creePar: string | null, modifiePar: string | null) {
    super(props);
    this.id = id;
    this.creePar = creePar;
    this.modifiePar = modifiePar;
  }

  withPatch(patch: {
    libelle?: string;
    canaux?: readonly AlertChannel[];
    seuilVolumePct?: number | null;
    seuilDateJours?: number | null;
    actif?: boolean;
  }): PersistedAlertConfig {
    if (patch.libelle !== undefined) AlertConfig.validateLibelle(patch.libelle);
    if (patch.canaux !== undefined) AlertConfig.validateCanaux(patch.canaux);
    const newVolume =
      patch.seuilVolumePct === undefined ? this.seuilVolumePct : patch.seuilVolumePct;
    const newDate = patch.seuilDateJours === undefined ? this.seuilDateJours : patch.seuilDateJours;
    AlertConfig.validateSeuils(newVolume, newDate);
    return new PersistedAlertConfig(
      {
        clientId: this.clientId,
        libelle: patch.libelle ?? this.libelle,
        canaux: patch.canaux ?? this.canaux,
        seuilVolumePct: newVolume,
        seuilDateJours: newDate,
        actif: patch.actif ?? this.actif,
      },
      this.id,
      this.creePar,
      this.modifiePar,
    );
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return { id: this.id, ...super.toAuditSnapshot() };
  }
}
