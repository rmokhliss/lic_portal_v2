// ==============================================================================
// LIC v2 — Entité ClientRef (Phase 24)
//
// Référentiel des codes clients S2M (lecture seule depuis l'UI). PK business
// stable = codeClient (varchar 50). Pas de serial intermédiaire.
//
// L'entité ne fournit que `rehydrate` : la table est alimentée par le seed
// bootstrap (validation au moment de l'INSERT côté seed) et lue depuis l'UI
// — aucune création/édition runtime. Pas de validateurs métier nécessaires,
// donc aucun code SPX-LIC-NNN spécifique alloué pour ce module.
// ==============================================================================

export interface RehydrateClientRefProps {
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly actif: boolean;
  readonly createdAt: Date;
}

interface ClientRefProps {
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly actif: boolean;
  readonly createdAt: Date;
}

export class ClientRef {
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly actif: boolean;
  readonly createdAt: Date;

  protected constructor(props: ClientRefProps) {
    this.codeClient = props.codeClient;
    this.raisonSociale = props.raisonSociale;
    this.actif = props.actif;
    this.createdAt = props.createdAt;
  }

  static rehydrate(props: RehydrateClientRefProps): ClientRef {
    return new ClientRef({
      codeClient: props.codeClient,
      raisonSociale: props.raisonSociale,
      actif: props.actif,
      createdAt: props.createdAt,
    });
  }
}
