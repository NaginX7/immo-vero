"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";

import { addEchange } from "@/lib/actions";
import { EXCHANGE_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
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

export function AddEchangeDialog({
  contactId,
  bienId,
  partenaireId,
  label = "Ajouter un échange",
}: {
  contactId?: string;
  bienId?: string;
  partenaireId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel échange</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              await addEchange(fd);
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
              <Label htmlFor="ex-type">Type</Label>
              <NativeSelect id="ex-type" name="type" defaultValue="NOTE">
                {Object.entries(EXCHANGE_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ex-dir">Sens</Label>
              <NativeSelect id="ex-dir" name="direction" defaultValue="">
                <option value="">—</option>
                <option value="sortant">Sortant</option>
                <option value="entrant">Entrant</option>
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ex-contenu">Contenu</Label>
            <Textarea
              id="ex-contenu"
              name="contenu"
              required
              rows={4}
              placeholder="Détail de l'échange, de l'appel ou de la note…"
            />
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
