// ==============================================================================
// LIC v2 — PasswordRevealDialog (Phase 2.B.bis EC-08)
//
// Client Component dédié à la révélation d'un mot de passe généré (création
// nouveau compte OU reset par admin). Affiché UNE FOIS — l'API serveur ne
// renvoie le mot de passe en clair qu'à la réponse de la Server Action ;
// après fermeture du Dialog, le mdp est perdu côté client.
//
// Bloque la fermeture accidentelle (clic outside / Escape) via les events
// Radix onPointerDownOutside et onEscapeKeyDown — l'utilisateur DOIT cliquer
// le bouton « J'ai noté le mot de passe » qui valide explicitement la prise
// de connaissance (cf. brief Stop 4).
// ==============================================================================

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PasswordRevealDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** null = composant fermé / réinitialisé. */
  readonly password: string | null;
  /** Format L9 « Prénom NOM (MAT-XXX) » pour rappeler le compte concerné. */
  readonly userDisplay: string;
  readonly context: "create" | "reset";
}

export function PasswordRevealDialog({
  open,
  onOpenChange,
  password,
  userDisplay,
  context,
}: PasswordRevealDialogProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    if (password === null) return;
    void navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Verrouillage : pas de fermeture par Escape ni clic outside, l'utilisateur
        // DOIT cliquer le bouton de confirmation pour fermer.
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {context === "create" ? "Mot de passe généré" : "Mot de passe réinitialisé"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bandeau d'avertissement — sémantique destructive (DS) */}
          <div className="bg-destructive/15 border-destructive/40 text-destructive rounded-md border px-3 py-2 text-sm">
            <strong>Ne sera plus affiché.</strong> Communiquez ce mot de passe immédiatement à
            l'utilisateur par un canal sécurisé (téléphone, en personne, messagerie d'entreprise).
            L'utilisateur devra le changer à sa première connexion.
          </div>

          <div className="space-y-1">
            <Label>Compte concerné</Label>
            <p className="text-foreground font-mono text-sm">{userDisplay}</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="generated-password">Mot de passe</Label>
            <div className="flex items-center gap-2">
              <Input
                id="generated-password"
                readOnly
                value={password ?? ""}
                className="text-foreground font-mono"
              />
              <Button type="button" variant="outline" onClick={onCopy} disabled={password === null}>
                {copied ? "Copié ✓" : "Copier"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
          >
            J'ai noté le mot de passe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
