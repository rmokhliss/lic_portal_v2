// ==============================================================================
// LIC v2 — Types DTO user ré-exposés au Client Component (Phase 2.B.bis EC-08)
//
// Le DTO serveur (user/adapters/postgres/user.mapper.ts) est de type ESLint
// "adapters" — boundaries n'autorise pas `app-route → adapters`. On dédouble
// l'interface ici (élément app-route), strictement alignée par construction.
// Cf. R-31 (étape 7) — pattern à promouvoir vers shared/src/types/ en v2.2+.
// ==============================================================================

export type UserRoleClient = "SADMIN" | "ADMIN" | "USER";

export interface UserDTO {
  readonly id: string;
  readonly matricule: string;
  readonly nom: string;
  readonly prenom: string;
  readonly email: string;
  readonly role: UserRoleClient;
  readonly telephone: string | null;
  readonly mustChangePassword: boolean;
  readonly actif: boolean;
  readonly dateCreation: string;
  readonly display: string;
}
