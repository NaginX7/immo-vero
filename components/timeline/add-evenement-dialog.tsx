"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";

import type { EventType } from "@prisma/client";

import { addEvenement } from "@/lib/actions";
import { EVENT_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

export function AddEvenementDialog({
  contactId,
  bienId,
  partenaireId,
  label = "Ajouter un événement",
  title = "Nouvel événement",
  types = ALL_EVENT_TYPES,
  titrePlaceholder = "Ex: Visite avec M. Schmitt",
}: {
  contactId?: string;
  bienId?: string;
  partenaireId?: string;
  label?: string;
  title?: string;
  types?: EventType[];
  titrePlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarPlus className="h-4 w-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              await addEvenement(fd);
              setOpen(false);
            })
          }
          className="space-y-4"
        >
          {contactId && <input type="hidden" name="contactId" value={contactId} />}
          {bienId && <input type="hidden" name="bienId" value={bienId} />}
          {partenaireId && (
            <input type="hidden" name="partenaireId" value={partenaireId} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-type">Type</Label>
              <NativeSelect id="ev-type" name="type" defaultValue={types[0]}>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {EVENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">Date</Label>
              <Input id="ev-date" name="date" type="datetime-local" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-titre">Intitulé</Label>
            <Input
              id="ev-titre"
              name="titre"
              required
              placeholder={titrePlaceholder}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Description</Label>
            <Textarea id="ev-desc" name="description" rows={3} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
