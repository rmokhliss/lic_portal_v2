// ==============================================================================
// LIC v2 — Types DTO ré-exposés au Client Component (Phase 2.B étape 7/7)
//
// Les DTOs serveur (adapters/postgres/*.mapper.ts) sont du type ESLint
// "adapters" — boundaries n'autorise pas `app-route → adapters`. On dédouble
// donc les interfaces ici (élément app-route), strictement alignées par
// construction. Si une DTO serveur évolue, le typecheck cross-fichier
// (Server Component team/page.tsx qui passe la donnée → Client Component qui
// la consomme) attrapera la dérive.
// ==============================================================================

export interface RegionDTO {
  readonly id: number;
  readonly regionCode: string;
  readonly nom: string;
  readonly dmResponsable: string | null;
  readonly actif: boolean;
  readonly dateCreation: string;
}

export interface PaysDTO {
  readonly id: number;
  readonly codePays: string;
  readonly nom: string;
  readonly regionCode: string | null;
  readonly actif: boolean;
  readonly dateCreation: string;
}

export interface DeviseDTO {
  readonly id: number;
  readonly codeDevise: string;
  readonly nom: string;
  readonly symbole: string | null;
  readonly actif: boolean;
}

export interface LangueDTO {
  readonly id: number;
  readonly codeLangue: string;
  readonly nom: string;
  readonly actif: boolean;
}

export interface TypeContactDTO {
  readonly id: number;
  readonly code: string;
  readonly libelle: string;
  readonly actif: boolean;
}

export type RoleTeam = "SALES" | "AM" | "DM";

export interface TeamMemberDTO {
  readonly id: number;
  readonly nom: string;
  readonly prenom: string | null;
  readonly email: string | null;
  readonly telephone: string | null;
  readonly roleTeam: RoleTeam;
  readonly regionCode: string | null;
  readonly actif: boolean;
  readonly dateCreation: string;
}
