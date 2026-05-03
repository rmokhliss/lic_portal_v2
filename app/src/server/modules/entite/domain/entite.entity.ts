// ==============================================================================
// LIC v2 — Entité Entite (Phase 4 étape 4.C — EC-Clients)
//
// Niveau intermédiaire client → entité → licence. data-model v1 §lic_entites.
// Soft delete via `actif` boolean (pas de version optimistic locking — volume
// faible <10 par client, faible concurrence d'édition).
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

const NOM_MAX_LEN = 200;
const NOM_MIN_LEN = 1;

export interface CreateEntiteDomainInput {
  readonly clientId: string;
  readonly nom: string;
  readonly codePays?: string;
}

export interface RehydrateEntiteProps {
  readonly id: string;
  readonly clientId: string;
  readonly nom: string;
  readonly codePays: string | null;
  readonly actif: boolean;
  readonly dateCreation: Date;
}

interface EntiteProps {
  readonly clientId: string;
  readonly nom: string;
  readonly codePays: string | null;
  readonly actif: boolean;
}

export class Entite {
  readonly clientId: string;
  readonly nom: string;
  readonly codePays: string | null;
  readonly actif: boolean;

  protected constructor(props: EntiteProps) {
    this.clientId = props.clientId;
    this.nom = props.nom;
    this.codePays = props.codePays;
    this.actif = props.actif;
  }

  static create(input: CreateEntiteDomainInput): Entite {
    Entite.validateNom(input.nom);
    return new Entite({
      clientId: input.clientId,
      nom: input.nom,
      codePays: input.codePays ?? null,
      actif: true,
    });
  }

  static rehydrate(props: RehydrateEntiteProps): PersistedEntite {
    return new PersistedEntite(
      {
        clientId: props.clientId,
        nom: props.nom,
        codePays: props.codePays,
        actif: props.actif,
      },
      props.id,
      props.dateCreation,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      clientId: this.clientId,
      nom: this.nom,
      codePays: this.codePays,
      actif: this.actif,
    };
  }

  static validateNom(nom: string): void {
    if (typeof nom !== "string" || nom.length < NOM_MIN_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-732",
        message: "nom obligatoire (string non vide)",
      });
    }
    if (nom.length > NOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-732",
        message: `nom > ${String(NOM_MAX_LEN)} caractères`,
      });
    }
  }
}

export class PersistedEntite extends Entite {
  readonly id: string;
  readonly dateCreation: Date;

  constructor(props: EntiteProps, id: string, dateCreation: Date) {
    super(props);
    this.id = id;
    this.dateCreation = dateCreation;
  }

  withProfile(patch: {
    readonly nom?: string;
    readonly codePays?: string | null;
  }): PersistedEntite {
    if (patch.nom !== undefined) Entite.validateNom(patch.nom);
    return new PersistedEntite(
      {
        clientId: this.clientId,
        nom: patch.nom ?? this.nom,
        codePays: patch.codePays === undefined ? this.codePays : patch.codePays,
        actif: this.actif,
      },
      this.id,
      this.dateCreation,
    );
  }

  toggle(): PersistedEntite {
    return new PersistedEntite(
      {
        clientId: this.clientId,
        nom: this.nom,
        codePays: this.codePays,
        actif: !this.actif,
      },
      this.id,
      this.dateCreation,
    );
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return { id: this.id, ...super.toAuditSnapshot() };
  }
}
