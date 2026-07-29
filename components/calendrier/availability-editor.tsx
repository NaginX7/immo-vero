"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2, Pencil } from "lucide-react";
import type { AvailabilityRule } from "@prisma/client";

import {
  upsertAvailabilityRule,
  deleteAvailabilityRule,
} from "@/lib/calendar-actions";
import { JOURS_LABELS, JOURS_ORDER } from "@/lib/slots";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EditTarget =
  | { mode: "edit"; rule: AvailabilityRule }
  | { mode: "create"; jour: number };

const JOURS_OUVRES = [1, 2, 3, 4, 5];

export function AvailabilityEditor({ rules }: { rules: AvailabilityRule[] }) {
  const [target, setTarget] = useState<EditTarget | null>(null);
  const [toast, setToast] = useState("");

  return (
    <div className="space-y-1">
      {JOURS_ORDER.map((jour) => {
        const dayRules = rules.filter((r) => r.jourSemaine === jour);
        return (
          <div
            key={jour}
            className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-muted/50"
          >
            <span className="w-24 shrink-0 text-sm font-medium text-navy-800">
              {JOURS_LABELS[jour]}
            </span>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {dayRules.length === 0 && (
                <span className="text-sm text-muted-foreground">Fermé</span>
              )}
              {dayRules.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTarget({ mode: "edit", rule: r })}
                  title="Cliquer pour modifier cette plage"
                  className={cn(
                    "group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                    r.actif
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100"
                      : "border-border bg-muted text-muted-foreground line-through hover:bg-muted/80"
                  )}
                >
                  {r.heureDebut} – {r.heureFin}
                  <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                </button>
              ))}
              <button
                onClick={() => setTarget({ mode: "create", jour })}
                title="Ajouter une plage"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-coral-300 hover:bg-powder-50 hover:text-coral-600"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      {target && (
        <RuleDialog
          target={target}
          onClose={() => setTarget(null)}
          onSaved={(msg) => {
            setTarget(null);
            setToast(msg);
          }}
        />
      )}

      <Toast show={!!toast} message={toast} onDone={() => setToast("")} />
    </div>
  );
}

function RuleDialog({
  target,
  onClose,
  onSaved,
}: {
  target: EditTarget;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = target.mode === "edit";
  const jour = isEdit ? target.rule.jourSemaine : target.jour;

  const [debut, setDebut] = useState(isEdit ? target.rule.heureDebut : "09:00");
  const [fin, setFin] = useState(isEdit ? target.rule.heureFin : "12:00");
  const [actif, setActif] = useState(isEdit ? target.rule.actif : true);
  const [tousJours, setTousJours] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await upsertAvailabilityRule({
        id: isEdit ? target.rule.id : undefined,
        jours: isEdit ? undefined : tousJours ? JOURS_OUVRES : [jour],
        heureDebut: debut,
        heureFin: fin,
        actif,
      });
      if (res.ok) {
        onSaved(isEdit ? "Plage horaire modifiée" : "Plage horaire ajoutée");
      } else {
        setError(res.error ?? "Erreur");
      }
    });
  }

  function remove() {
    if (!isEdit) return;
    start(async () => {
      await deleteAvailabilityRule(target.rule.id);
      onSaved("Plage horaire supprimée");
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la plage" : "Nouvelle plage"} —{" "}
            {JOURS_LABELS[jour]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">De</Label>
              <Input
                type="time"
                value={debut}
                onChange={(e) => setDebut(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">À</Label>
              <Input
                type="time"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
              />
            </div>
          </div>

          {isEdit ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={actif}
                onCheckedChange={(v) => setActif(v === true)}
              />
              Plage active (proposée à la réservation)
            </label>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={tousJours}
                onCheckedChange={(v) => setTousJours(v === true)}
              />
              Appliquer du lundi au vendredi
            </label>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2 sm:justify-between">
            {isEdit ? (
              <Button
                variant="ghost"
                onClick={remove}
                disabled={pending}
                className="text-destructive hover:bg-red-50 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={save} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
