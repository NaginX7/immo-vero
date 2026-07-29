"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Loader2 } from "lucide-react";
import type { Partenaire } from "@prisma/client";

import { createPartenaire, updatePartenaire } from "@/lib/actions";
import { PARTENAIRE_TYPE_LABELS } from "@/lib/labels";
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

export function PartenaireFormDialog({
  partenaire,
}: {
  partenaire?: Partenaire;
}) {
  const isEdit = !!partenaire;
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const action = isEdit
    ? (fd: FormData) =>
        start(async () => {
          await updatePartenaire(partenaire!.id, fd);
          setOpen(false);
        })
    : (fd: FormData) => start(() => createPartenaire(fd));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
        ) : (
          <Button variant="accent">
            <Plus className="h-4 w-4" /> Nouveau partenaire
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le partenaire" : "Nouveau partenaire"}
          </DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom *</Label>
              <Input name="nom" required defaultValue={partenaire?.nom} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <NativeSelect name="type" defaultValue={partenaire?.type ?? "AUTRE"}>
                {Object.entries(PARTENAIRE_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Société</Label>
              <Input name="societe" defaultValue={partenaire?.societe ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Spécialité</Label>
              <Input
                name="specialite"
                defaultValue={partenaire?.specialite ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Téléphone</Label>
              <Input name="telephone" defaultValue={partenaire?.telephone ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                name="email"
                type="email"
                defaultValue={partenaire?.email ?? ""}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Adresse</Label>
              <Input name="adresse" defaultValue={partenaire?.adresse ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nb d&apos;affaires ensemble</Label>
              <Input
                name="nbAffaires"
                type="number"
                defaultValue={partenaire?.nbAffaires ?? 0}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea name="notes" rows={2} defaultValue={partenaire?.notes ?? ""} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer le partenaire"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
