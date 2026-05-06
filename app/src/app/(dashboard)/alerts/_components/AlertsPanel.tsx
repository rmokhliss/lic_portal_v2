// ==============================================================================
// LIC v2 — AlertsPanel (Client Component, Phase 17 S4)
//
// Panel CRUD alert-configs cross-clients. 1 dialog création + 1 dialog édition
// + 1 dialog confirmation suppression. Server Actions branchées sur les
// use-cases module alert-config (audit transactionnel L3).
// ==============================================================================

"use client";

import { useState, useTransition } from "react";

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

import {
  createAlertConfigAction,
  deleteAlertConfigAction,
  updateAlertConfigAction,
} from "../_actions";

export interface AlertConfigRow {
  readonly id: string;
  readonly clientId: string;
  readonly libelle: string;
  readonly canaux: readonly ("IN_APP" | "EMAIL" | "SMS")[];
  readonly seuilVolumePct: number | null;
  readonly seuilDateJours: number | null;
  readonly actif: boolean;
}

export interface ClientLite {
  readonly id: string;
  readonly codeClient: string;
  readonly raisonSociale: string;
}

const CHANNELS = ["IN_APP", "EMAIL", "SMS"] as const;
type Channel = (typeof CHANNELS)[number];

export function AlertsPanel({
  configs,
  clients,
}: {
  readonly configs: readonly AlertConfigRow[];
  readonly clients: readonly ClientLite[];
}): React.JSX.Element {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AlertConfigRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlertConfigRow | null>(null);

  const clientById = new Map(clients.map((c) => [c.id, c]));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>+ Nouvelle alerte</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouvelle alerte</DialogTitle>
            </DialogHeader>
            <AlertForm
              mode="create"
              clients={clients}
              onDone={() => {
                setCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border-border bg-surface-1 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Client</th>
              <th className="px-4 py-2 text-left font-medium">Libellé</th>
              <th className="px-4 py-2 text-left font-medium">Canaux</th>
              <th className="px-4 py-2 text-right font-medium">Seuil volume</th>
              <th className="px-4 py-2 text-right font-medium">Seuil date (j)</th>
              <th className="px-4 py-2 text-left font-medium">Statut</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c) => {
              const client = clientById.get(c.clientId);
              return (
                <tr key={c.id} className="border-border border-t">
                  <td className="px-4 py-2 font-mono">
                    {client === undefined ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      client.codeClient
                    )}
                  </td>
                  <td className="px-4 py-2">{c.libelle}</td>
                  <td className="px-4 py-2 font-mono text-xs">{c.canaux.join(" · ")}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {c.seuilVolumePct === null ? "—" : `${String(c.seuilVolumePct)}%`}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{c.seuilDateJours ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        c.actif
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-zinc-500/15 text-zinc-400"
                      }`}
                    >
                      {c.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditTarget(c);
                        }}
                      >
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteTarget(c);
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {configs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted-foreground px-4 py-6 text-center">
                  Aucune alerte configurée. Cliquer sur « Nouvelle alerte » pour démarrer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog édition */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;alerte</DialogTitle>
          </DialogHeader>
          {editTarget !== null && (
            <AlertForm
              mode="edit"
              clients={clients}
              initial={editTarget}
              onDone={() => {
                setEditTarget(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;alerte ?</DialogTitle>
          </DialogHeader>
          {deleteTarget !== null && (
            <DeleteAlertForm
              target={deleteTarget}
              onDone={() => {
                setDeleteTarget(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlertForm({
  mode,
  clients,
  initial,
  onDone,
}: {
  readonly mode: "create" | "edit";
  readonly clients: readonly ClientLite[];
  readonly initial?: AlertConfigRow;
  readonly onDone: () => void;
}): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const [clientId, setClientId] = useState(initial?.clientId ?? clients[0]?.id ?? "");
  const [libelle, setLibelle] = useState(initial?.libelle ?? "");
  const [canaux, setCanaux] = useState<readonly Channel[]>(initial?.canaux ?? ["IN_APP"]);
  const [seuilVolume, setSeuilVolume] = useState<string>(
    initial?.seuilVolumePct === null || initial?.seuilVolumePct === undefined
      ? ""
      : String(initial.seuilVolumePct),
  );
  const [seuilDate, setSeuilDate] = useState<string>(
    initial?.seuilDateJours === null || initial?.seuilDateJours === undefined
      ? ""
      : String(initial.seuilDateJours),
  );
  const [actif, setActif] = useState<boolean>(initial?.actif ?? true);

  const toggleChannel = (c: Channel) => {
    setCanaux((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const seuilVol = seuilVolume.trim().length === 0 ? null : Number(seuilVolume);
    const seuilDt = seuilDate.trim().length === 0 ? null : Number(seuilDate);
    if (seuilVol === null && seuilDt === null) {
      setError("Au moins un seuil (volume ou date) est requis.");
      return;
    }
    if (canaux.length === 0) {
      setError("Au moins un canal est requis.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          if (mode === "create") {
            await createAlertConfigAction({
              clientId,
              libelle,
              canaux,
              seuilVolumePct: seuilVol,
              seuilDateJours: seuilDt,
              actif,
            });
          } else if (initial !== undefined) {
            await updateAlertConfigAction({
              id: initial.id,
              libelle,
              canaux,
              seuilVolumePct: seuilVol,
              seuilDateJours: seuilDt,
              actif,
            });
          }
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
      })();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="clientId">Client</Label>
        <select
          id="clientId"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
          }}
          disabled={mode === "edit"}
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm disabled:opacity-50"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codeClient} · {c.raisonSociale}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="libelle">Libellé</Label>
        <Input
          id="libelle"
          value={libelle}
          onChange={(e) => {
            setLibelle(e.target.value);
          }}
          maxLength={200}
          required
        />
      </div>
      <div className="space-y-1">
        <Label>Canaux</Label>
        <div className="flex gap-3">
          {CHANNELS.map((c) => (
            <label key={c} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={canaux.includes(c)}
                onChange={() => {
                  toggleChannel(c);
                }}
              />
              {c}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="seuilVolume">Seuil volume (%)</Label>
          <Input
            id="seuilVolume"
            type="number"
            min="1"
            max="200"
            value={seuilVolume}
            onChange={(e) => {
              setSeuilVolume(e.target.value);
            }}
            placeholder="ex: 80"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="seuilDate">Seuil date (jours)</Label>
          <Input
            id="seuilDate"
            type="number"
            min="1"
            value={seuilDate}
            onChange={(e) => {
              setSeuilDate(e.target.value);
            }}
            placeholder="ex: 30"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="actif"
          type="checkbox"
          checked={actif}
          onChange={(e) => {
            setActif(e.target.checked);
          }}
          className="size-4"
        />
        <Label htmlFor="actif">Actif</Label>
      </div>

      {error.length > 0 && <p className="text-destructive text-sm">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "..." : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteAlertForm({
  target,
  onDone,
}: {
  readonly target: AlertConfigRow;
  readonly onDone: () => void;
}): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onConfirm = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          await deleteAlertConfigAction({ id: target.id });
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur inconnue");
        }
      })();
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Êtes-vous sûr de vouloir supprimer l&apos;alerte{" "}
        <strong className="font-mono">{target.libelle}</strong> ? Cette action est tracée dans le
        journal d&apos;audit.
      </p>
      {error.length > 0 && <p className="text-destructive text-sm">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Annuler
        </Button>
        <Button type="button" onClick={onConfirm} disabled={pending}>
          {pending ? "Suppression..." : "Supprimer"}
        </Button>
      </DialogFooter>
    </div>
  );
}
