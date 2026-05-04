// ==============================================================================
// LIC v2 — Entité LicenceProduit (Phase 6 étape 6.C)
//
// Liaison N:N licence ↔ produit. PK uuidv7. Mutation de contrat de licence
// → audit obligatoire.
//
// Pas de mutation post-INSERT autre que la suppression (RemoveProduit).
// ==============================================================================

export interface LicenceProduitProps {
  readonly licenceId: string;
  readonly produitId: number;
}

export interface RehydrateLicenceProduitProps {
  readonly id: string;
  readonly licenceId: string;
  readonly produitId: number;
  readonly dateAjout: Date;
  readonly creePar: string | null;
}

export class LicenceProduit {
  readonly licenceId: string;
  readonly produitId: number;

  protected constructor(props: LicenceProduitProps) {
    this.licenceId = props.licenceId;
    this.produitId = props.produitId;
  }

  static create(props: LicenceProduitProps): LicenceProduit {
    return new LicenceProduit(props);
  }

  static rehydrate(props: RehydrateLicenceProduitProps): PersistedLicenceProduit {
    return new PersistedLicenceProduit(
      { licenceId: props.licenceId, produitId: props.produitId },
      props.id,
      props.dateAjout,
      props.creePar,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return { licenceId: this.licenceId, produitId: this.produitId };
  }
}

export class PersistedLicenceProduit extends LicenceProduit {
  readonly id: string;
  readonly dateAjout: Date;
  readonly creePar: string | null;

  constructor(props: LicenceProduitProps, id: string, dateAjout: Date, creePar: string | null) {
    super(props);
    this.id = id;
    this.dateAjout = dateAjout;
    this.creePar = creePar;
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return {
      id: this.id,
      licenceId: this.licenceId,
      produitId: this.produitId,
      dateAjout: this.dateAjout.toISOString(),
    };
  }
}
