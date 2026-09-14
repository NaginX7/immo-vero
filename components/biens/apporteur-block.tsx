"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, User, X, Loader2 } from "lucide-react";

import { setBienApporteur, removeBienApporteur } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type ContactLite = {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  email: string | null;
};

export function ApporteurBlock({
  bienId,
  apporteur,
  contacts,
}: {
  bienId: string;
  apporteur: ContactLite | null;
  contacts: ContactLite[];
}) {
  const [pending, start] = useTransition();

  return (
    <div>
      {!apporteur ? (
        <p className="text-sm text-muted-foreground">Aucun apporteur lié.</p>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Link
            href={`/contacts/${apporteur.id}`}
            className="flex min-w-0 flex-1 items-center gap-3 hover:text-coral-600"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-50 text-navy-600">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {`${apporteur.prenom ?? ""} ${apporteur.nom}`.trim()}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {apporteur.telephone ?? apporteur.email ?? "—"}
              </p>
            </div>
          </Link>
          <button
            onClick={() => start(() => removeBienApporteur(bienId))}
            className="shrink-0 text-muted-foreground hover:text-destructive"
            aria-label="Délier l'apporteur"
            disabled={pending}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-3">
        <SelectApporteurDialog bienId={bienId} contacts={contacts} />
      </div>
    </div>
  );
}

function SelectApporteurDialog({
  bienId,
  contacts,
}: {
  bienId: string;
  contacts: ContactLite[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sélectionner l&apos;apporteur d&apos;affaire</DialogTitle>
        </DialogHeader>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun contact disponible.
          </p>
        ) : (
          <form
            action={(fd) =>
              start(async () => {
                const contactId = fd.get("contactId") as string;
                if (contactId) await setBienApporteur(bienId, contactId);
                setOpen(false);
              })
            }
            className="space-y-4"
          >
            <NativeSelect name="contactId" required defaultValue="">
              <option value="" disabled>
                Sélectionner un contact…
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {`${c.prenom ?? ""} ${c.nom}`.trim()}
                </option>
              ))}
            </NativeSelect>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Lier
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
