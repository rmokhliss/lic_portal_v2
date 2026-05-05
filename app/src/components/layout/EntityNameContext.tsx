// ==============================================================================
// LIC v2 — EntityNameContext (Phase 16 — DETTE-LIC-009 résolue)
//
// Permet aux layouts /clients/[id] et /licences/[id] de pousser le nom de
// l'entité en cours (raisonSociale ou reference) jusqu'au Breadcrumb rendu
// dans (dashboard)/layout.tsx — context Server -> Client via Setter.
//
// Architecture :
//   - EntityNameProvider wrap l'arbre dashboard (Client Component à la racine).
//   - EntityNameSetter (Client) est rendu par chaque [id]/layout.tsx avec le
//     nom récupéré côté Server (raisonSociale / reference).
//   - useEntityName() consommé par Breadcrumb pour afficher le nom dynamique.
//
// Note : un bref flash "Détail" est attendu au premier rendu (avant useEffect
// de l'EntityNameSetter). Acceptable UX, l'alternative (Provider à un niveau
// plus profond) ne fonctionne pas car Breadcrumb est rendu dans dashboard/layout
// qui est PARENT des [id]/layout.
// ==============================================================================

"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface EntityNameContextValue {
  readonly name: string | null;
  readonly setName: (name: string | null) => void;
}

const EntityNameCtx = createContext<EntityNameContextValue>({
  name: null,
  setName: () => undefined,
});

export function EntityNameProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const [name, setName] = useState<string | null>(null);
  return <EntityNameCtx.Provider value={{ name, setName }}>{children}</EntityNameCtx.Provider>;
}

/** Hook consommé par Breadcrumb. Retourne null si aucun setter actif (page
 *  hors /clients/[id]/* ou /licences/[id]/*). */
export function useEntityName(): string | null {
  return useContext(EntityNameCtx).name;
}

/** Client Component rendu par les layouts [id] avec le nom de l'entité.
 *  Pose la valeur en context au mount, la nettoie au démontage. */
export function EntityNameSetter({ name }: { readonly name: string }): null {
  const { setName } = useContext(EntityNameCtx);
  useEffect(() => {
    setName(name);
    return () => {
      setName(null);
    };
  }, [name, setName]);
  return null;
}
