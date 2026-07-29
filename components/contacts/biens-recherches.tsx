"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, Link2, Search, Trash2, X, Loader2, Home } from "lucide-react";
import type { Bien, Recherche } from "@prisma/client";

import {
  addRecherche,
  deleteRecherche,
  linkBienToContact,
  unlinkBienFromContact,
} from "@/lib/actions";
import { formatEuro } from "@/lib/utils";
import { STAGE_LABELS } from "@/lib/labels";
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

type BienLite = Pick<
  Bien,
  "id" | "titre" | "ville" | "stage" | "prixEstime" | "prixMandat"
>;

export function BiensRecherchesTab({
  contactId,
  linkedBiens,
  availableBiens,
  recherches,
}: {
  contactId: string;
  linkedBiens: BienLite[];
  availableBiens: BienLite[];
  recherches: Recherche[];
}) {
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      {/* Biens liés */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-navy-800">
            Biens (propriétaire)
          </h4>
          <LinkBienDialog contactId={contactId} availableBiens={availableBiens} />
        </div>
        {linkedBiens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun bien lié.</p>
        ) : (
          <ul className="space-y-2">
            {linkedBiens.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <Link
                  href={`/biens/${b.id}`}
                  className="flex min-w-0 items-center gap-3 hover:text-coral-600"
                >
                  <Home className="h-4 w-4 shrink-0 text-navy-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {STAGE_LABELS[b.stage]} ·{" "}
                      {formatEuro(b.prixMandat ?? b.prixEstime)}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() =>
                    start(() => unlinkBienFromContact(contactId, b.id))
                  }
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Délier"
                  disabled={pending}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recherches */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-navy-800">
            Recherches (acquéreur)
          </h4>
          <AddRechercheDialog contactId={contactId} />
        </div>
        {recherches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune fiche recherche.
          </p>
        ) : (
          <ul className="space-y-2">
            {recherches.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Search className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {r.titre ?? "Recherche"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          r.typeBien,
                          r.secteur,
                          r.budgetMax
                            ? `≤ ${formatEuro(r.budgetMax)}`
                            : null,
                          r.surfaceMin ? `≥ ${r.surfaceMin} m²` : null,
                          r.nbChambresMin ? `≥ ${r.nbChambresMin} ch.` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {r.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {r.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      start(() => deleteRecherche(r.id, contactId))
                    }
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Supprimer"
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LinkBienDialog({
  contactId,
  availableBiens,
}: {
  contactId: string;
  availableBiens: BienLite[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Link2 className="h-4 w-4" /> Lier un bien
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lier un bien existant</DialogTitle>
        </DialogHeader>
        {availableBiens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tous les biens sont déjà liés à ce contact.
          </p>
        ) : (
          <form
            action={(fd) =>
              start(async () => {
                const bienId = fd.get("bienId") as string;
                if (bienId) await linkBienToContact(contactId, bienId);
                setOpen(false);
              })
            }
            className="space-y-4"
          >
            <NativeSelect name="bienId" required defaultValue="">
              <option value="" disabled>
                Sélectionner un bien…
              </option>
              {availableBiens.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.titre} {b.ville ? `(${b.ville})` : ""}
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

function AddRechercheDialog({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Recherche
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle fiche recherche</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) =>
            start(async () => {
              await addRecherche(fd);
              setOpen(false);
            })
          }
          className="space-y-4"
        >
          <input type="hidden" name="contactId" value={contactId} />
          <div className="space-y-1.5">
            <Label className="text-xs">Intitulé</Label>
            <Input name="titre" placeholder="Maison familiale Saverne" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type de bien</Label>
              <Input name="typeBien" placeholder="Maison / Appartement" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Secteur</Label>
              <Input name="secteur" placeholder="Saverne, Monswiller…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Budget min (€)</Label>
              <Input name="budgetMin" type="number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Budget max (€)</Label>
              <Input name="budgetMax" type="number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Surface min (m²)</Label>
              <Input name="surfaceMin" type="number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Chambres min</Label>
              <Input name="nbChambresMin" type="number" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea name="notes" rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer la recherche
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
