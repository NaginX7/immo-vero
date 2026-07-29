"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Loader2 } from "lucide-react";
import type { Contact, ContactRole } from "@prisma/client";

import { createContact, updateContact } from "@/lib/actions";
import { ROLE_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { CriteresAcquereur } from "@/components/contacts/criteres-acquereur";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ALL_ROLES = Object.keys(ROLE_LABELS) as ContactRole[];

export function ContactFormDialog({ contact }: { contact?: Contact }) {
  const isEdit = !!contact;
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [roles, setRoles] = useState<ContactRole[]>(contact?.roles ?? []);

  function basculerRole(role: ContactRole, coche: boolean) {
    setRoles((r) => (coche ? [...r, role] : r.filter((x) => x !== role)));
  }

  const action = isEdit
    ? (fd: FormData) =>
        start(async () => {
          await updateContact(contact!.id, fd);
          setOpen(false);
        })
    : (fd: FormData) => start(() => createContact(fd));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
        ) : (
          <Button variant="accent">
            <Plus className="h-4 w-4" /> Nouveau contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le contact" : "Nouveau contact"}
          </DialogTitle>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Civilité</Label>
              <NativeSelect name="civilite" defaultValue={contact?.civilite ?? ""}>
                <option value="">—</option>
                <option value="M.">M.</option>
                <option value="Mme">Mme</option>
              </NativeSelect>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Nom *</Label>
              <Input name="nom" required defaultValue={contact?.nom} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prénom</Label>
              <Input name="prenom" defaultValue={contact?.prenom ?? ""} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Statut / rôle</Label>
            <div className="mt-2 flex flex-wrap gap-4">
              {ALL_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    name="roles"
                    value={role}
                    checked={roles.includes(role)}
                    onCheckedChange={(v) => basculerRole(role, v === true)}
                  />
                  {ROLE_LABELS[role]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Téléphone</Label>
              <Input name="telephone" defaultValue={contact?.telephone ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                name="email"
                type="email"
                defaultValue={contact?.email ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Adresse</Label>
              <Input name="adresse" defaultValue={contact?.adresse ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Code postal</Label>
              <Input name="codePostal" defaultValue={contact?.codePostal ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ville</Label>
              <Input name="ville" defaultValue={contact?.ville ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Profession</Label>
              <Input name="profession" defaultValue={contact?.profession ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Situation familiale</Label>
              <Input
                name="situationFamiliale"
                defaultValue={contact?.situationFamiliale ?? ""}
              />
            </div>
          </div>

          {/* Critères de recherche : uniquement à la création d'un acquéreur.
              Pour un contact existant, les recherches se gèrent depuis sa fiche
              (onglet « Biens & Recherches »), qui en accepte plusieurs. */}
          {!isEdit && roles.includes("ACQUEREUR") && <CriteresAcquereur />}

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea name="notes" rows={2} defaultValue={contact?.notes ?? ""} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer le contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
