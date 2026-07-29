"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, Loader2, CalendarOff } from "lucide-react";
import type { SlotClosure } from "@prisma/client";

import { addClosure, deleteClosure } from "@/lib/calendar-actions";
import { formatDateShort } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

function heure(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function ClosuresEditor({ closures }: { closures: SlotClosure[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [journee, setJournee] = useState(true);
  const [error, setError] = useState("");

  return (
    <div className="space-y-4">
      {closures.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune fermeture programmée.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {closures.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2">
                <CalendarOff className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  {formatDateShort(c.debut)}
                  {c.journee ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · journée entière
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {" "}
                      · {heure(c.debut)} – {heure(c.fin)}
                    </span>
                  )}
                  {c.motif && (
                    <span className="text-muted-foreground"> · {c.motif}</span>
                  )}
                </span>
              </div>
              <button
                onClick={() => start(() => deleteClosure(c.id))}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Supprimer la fermeture"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={(fd) =>
          start(async () => {
            const res = await addClosure(fd);
            if (res?.ok === false) setError(res.error ?? "Erreur");
            else {
              setError("");
              formRef.current?.reset();
            }
          })
        }
        className="space-y-3 border-t border-border pt-4"
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input name="date" type="date" required className="w-44" />
          </div>
          {!journee && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">De</Label>
                <Input
                  name="heureDebut"
                  type="time"
                  defaultValue="12:00"
                  className="w-32"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">À</Label>
                <Input
                  name="heureFin"
                  type="time"
                  defaultValue="14:00"
                  className="w-32"
                />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Motif</Label>
            <Input name="motif" placeholder="Congés, formation…" className="w-48" />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Fermer ce créneau
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            name="journee"
            checked={journee}
            onCheckedChange={(v) => setJournee(v === true)}
          />
          Journée entière
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </div>
  );
}
