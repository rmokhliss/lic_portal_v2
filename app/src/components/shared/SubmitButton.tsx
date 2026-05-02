// ==============================================================================
// LIC v2 — SubmitButton (F-09)
//
// Client Component minimaliste qui wrap <Button> shadcn avec useFormStatus.
// Affiche un loader + disabled pendant la soumission d'un Server Action.
// Réutilisable par toutes les pages avec <form action={action}> :
//   - /login (loginAction)
//   - /change-password (changePasswordAction)
//   - F-10+ Server Actions à venir
// ==============================================================================

"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export interface SubmitButtonProps {
  /** Label affiché en état idle. */
  readonly children: React.ReactNode;
  /** Label affiché pendant la soumission (par défaut : "Envoi…"). */
  readonly pendingLabel?: string;
  /** Variante shadcn. Par défaut "default" (primary cyan). */
  readonly variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  /** Taille shadcn. Par défaut "default". */
  readonly size?: "default" | "sm" | "lg" | "xs";
  readonly className?: string;
}

export function SubmitButton({
  children,
  pendingLabel = "Envoi…",
  variant = "default",
  size = "default",
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} size={size} className={className}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
