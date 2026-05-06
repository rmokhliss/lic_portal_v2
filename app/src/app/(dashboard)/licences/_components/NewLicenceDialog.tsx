// ==============================================================================
// LIC v2 — NewLicenceDialog (Client Component, Phase 18 R-12)
//
// Dialog de création licence — 1 seul écran (wizard plat, ≤3 étapes par
// décision UX) :
//   1. Client (combobox)
//   2. Entité (rechargée via Server Action quand le client change)
//   3. Date début + Date fin + Commentaire optionnel
//
// La référence est auto-allouée par CreateLicenceUseCase (séquence PG
// LIC-{YYYY}-NNN). Le statut initial est ACTIF (default Licence.create).
// ==============================================================================

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createLicenceAction, listEntitesForClientAction, type EntiteOption } from "../_actions";

export interface ClientOption {
  readonly id: string;
  readonly codeClient: string;
  readonly raisonSociale: string;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);
const inYearsIso = (n: number): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
};

export function NewLicenceDialog({
  clients,
}: {
  readonly clients: readonly ClientOption[];
}): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? "");
  const [entites, setEntites] = useState<readonly EntiteOption[]>([]);
  const [entiteId, setEntiteId] = useState<string>("");
  const [dateDebut, setDateDebut] = useState<string>(todayIso());
  const [dateFin, setDateFin] = useState<string>(inYearsIso(2));
  const [commentaire, setCommentaire] = useState<string>("");
  const [renouvellementAuto, setRenouvellementAuto] = useState<boolean>(false);

  // Recharge la liste des entités quand le client sélectionné change.
  useEffect(() => {
    if (clientId === "") {
      setEntites([]);
      setEntiteId("");
      return;
    }
    // Flag mutable côté closure — annotation explicite pour empêcher le
    // narrow TS `false` literal qui ferait paraître les `if (cancelled)`
    // morts après le re-render React.
    const state: { cancelled: boolean } = { cancelled: false };
    void (async () => {
      try {
        const list = await listEntitesForClientAction(clientId);
        if (state.cancelled) return;
        setEntites(list);
        setEntiteId(list[0]?.id ?? "");
      } catch (err) {
        if (state.cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur chargement entités");
        setEntites([]);
        setEntiteId("");
      }
    })();
    return () => {
      state.cancelled = true;
    };
  }, [clientId]);

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (clientId === "" || entiteId === "") {
      setError("Client et entité requis.");
      return;
    }
    if (new Date(dateFin) <= new Date(dateDebut)) {
      setError("La date de fin doit être strictement postérieure à la date de début.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          await createLicenceAction({
            clientId,
            entiteId,
            dateDebut,
            dateFin,
            ...(commentaire.trim().length > 0 ? { commentaire: commentaire.trim() } : {}),
            renouvellementAuto,
          });
          setOpen(false);
          // Reset partiel pour ré-ouverture éventuelle.
          setCommentaire("");
          setRenouvellementAuto(false);
          // Force re-render de la page Server Component pour afficher la
          // nouvelle licence dans le tableau.
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
      })();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Nouvelle licence</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle licence</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="clientId">Client</Label>
            <select
              id="clientId"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
              }}
              required
              className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">— Choisir un client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codeClient} · {c.raisonSociale}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="entiteId">Entité</Label>
            <select
              id="entiteId"
              value={entiteId}
              onChange={(e) => {
                setEntiteId(e.target.value);
              }}
              required
              disabled={entites.length === 0}
              className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm disabled:opacity-50"
            >
              {entites.length === 0 ? (
                <option value="">— Sélectionner d&apos;abord un client —</option>
              ) : (
                entites.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="dateDebut">Date début</Label>
              <Input
                id="dateDebut"
                type="date"
                value={dateDebut}
                onChange={(e) => {
                  setDateDebut(e.target.value);
                }}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateFin">Date fin</Label>
              <Input
                id="dateFin"
                type="date"
                value={dateFin}
                onChange={(e) => {
                  setDateFin(e.target.value);
                }}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
            <Input
              id="commentaire"
              value={commentaire}
              onChange={(e) => {
                setCommentaire(e.target.value);
              }}
              maxLength={500}
              placeholder="Note interne pour cette licence"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="renouvellementAuto"
              type="checkbox"
              checked={renouvellementAuto}
              onChange={(e) => {
                setRenouvellementAuto(e.target.checked);
              }}
              className="size-4"
            />
            <Label htmlFor="renouvellementAuto">
              Activer le renouvellement automatique (job batch)
            </Label>
          </div>

          {error.length > 0 && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
