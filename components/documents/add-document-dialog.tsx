"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import type { DocType } from "@prisma/client";

import { addDocument } from "@/lib/actions";
import { DOC_TYPE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
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

const CONTACT_DOC_TYPES: DocType[] = [
  "PIECE_IDENTITE",
  "JUSTIF_DOMICILE",
  "ORIGINE_FONDS",
  "MODE_FINANCEMENT",
  "AUTRE",
];

export function AddDocumentDialog({
  contactId,
  bienId,
  types = CONTACT_DOC_TYPES,
}: {
  contactId?: string;
  bienId?: string;
  types?: DocType[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Pièce
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une pièce</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              await addDocument(fd);
              setOpen(false);
            })
          }
          className="space-y-4"
        >
          {contactId && <input type="hidden" name="contactId" value={contactId} />}
          {bienId && <input type="hidden" name="bienId" value={bienId} />}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <NativeSelect name="type" defaultValue={types[0]}>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {DOC_TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Statut</Label>
              <NativeSelect name="statut" defaultValue="MANQUANT">
                <option value="MANQUANT">Manquant</option>
                <option value="RECU">Reçu</option>
                <option value="NON_APPLICABLE">Non applicable</option>
              </NativeSelect>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
