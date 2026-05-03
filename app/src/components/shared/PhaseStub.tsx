// ==============================================================================
// LIC v2 — PhaseStub (Phase 2.B étape 6/7)
//
// Server Component d'affichage pour un onglet /settings dont l'implémentation
// est planifiée à une phase ultérieure du roadmap (PROJECT_CONTEXT_LIC.md §3).
// EmptyState DS SELECT-PX : icône Construction + bandeau « Disponible Phase X »
// + label/description spécifique à l'onglet.
//
// L'onglet /settings concerné (security, smtp, catalogues, users, sandbox,
// demo) reste navigable et visible pour le SADMIN, mais le contenu indique
// explicitement la phase d'arrivée. Aucun appel use-case ni mutation : pure
// présentation.
// ==============================================================================

import { Construction } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";

export interface PhaseStubProps {
  /** Numéro de phase d'arrivée (ex: "3", "6", "8", "12"). */
  readonly phase: string;
  /** Label court de l'onglet (ex: "Sécurité PKI"). */
  readonly label: string;
  /** Description optionnelle plus longue (1-2 phrases). */
  readonly description?: string;
}

export async function PhaseStub({ phase, label, description }: PhaseStubProps) {
  const t = await getTranslations("settings.stub");
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 px-8 py-16 text-center">
        <Construction className="text-muted-foreground size-12" aria-hidden />
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
          {t("available", { phase })}
        </p>
        <h2 className="font-display text-foreground text-xl">{label}</h2>
        {description !== undefined && (
          <p className="text-muted-foreground max-w-md text-sm">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
