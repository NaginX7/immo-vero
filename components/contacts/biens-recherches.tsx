"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Plus,
  Link2,
  Search,
  Trash2,
  X,
  Loader2,
  Home,
  Wallet,
  Handshake,
} from "lucide-react";
import type { Bien, Recherche } from "@prisma/client";

import {
  addRecherche,
  deleteRecherche,
  linkBienToContact,
  unlinkBienFromContact,
  removeBienApporteur,
} from "@/lib/actions";
import { formatEuro } from "@/lib/utils";
import { STAGE_LABELS, MODE_FINANCEMENT_LABELS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

type BienLite = Pick<
  Bien,
  "id" | "titre" | "ville" | "stage" | "prixEstime" | "prixMandat"
>;

export function BiensRecherchesTab({
  contactId,
  linkedBiens,
  availableBiens,
  recherches,
  apporteurBiens,
}: {
  contactId: string;
  linkedBiens: BienLite[];
  availableBiens: BienLite[];
  recherches: Recherche[];
  apporteurBiens?: BienLite[];
}) {
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      {/* Biens où ce contact est apporteur d'affaire (renseigné depuis la fiche bien) */}
      {apporteurBiens && apporteurBiens.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-navy-800">
            Biens (apporteur d&apos;affaire)
          </h4>
          <ul className="space-y-2">
            {apporteurBiens.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <Link
                  href={`/biens/${b.id}`}
                  className="flex min-w-0 items-center gap-3 hover:text-coral-600"
                >
                  <Handshake className="h-4 w-4 shrink-0 text-navy-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{b.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {STAGE_LABELS[b.stage]} ·{" "}
                      {formatEuro(b.prixMandat ?? b.prixEstime)}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => start(() => removeBienApporteur(b.id))}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Délier l'apporteur"
                  disabled={pending}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                          r.nbPiecesMin ? `≥ ${r.nbPiecesMin} p.` : null,
                          r.nbChambresMin ? `≥ ${r.nbChambresMin} ch.` : null,
                          r.avecTerrain
                            ? r.surfaceTerrainMin
                              ? `terrain ≥ ${r.surfaceTerrainMin} m²`
                              : "terrain"
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>

                      {/* Prestations souhaitées */}
                      {(r.garage || r.sousSol || r.dependance || r.piscine) && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {[
                            r.garage && "Garage",
                            r.sousSol && "Sous-sol",
                            r.dependance && "Dépendance",
                            r.piscine && "Piscine",
                          ]
                            .filter(Boolean)
                            .map((p) => (
                              <span
                                key={String(p)}
                                className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] text-navy-700"
                              >
                                {p}
                              </span>
                            ))}
                        </div>
                      )}

                      {r.modesFinancement.length > 0 && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Wallet className="h-3 w-3 shrink-0" />
                          {r.modesFinancement
                            .map((m) => MODE_FINANCEMENT_LABELS[m])
                            .join(", ")}
                        </p>
                      )}

                      {r.historique && (
                        <p className="mt-1.5 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                          <span className="font-medium">Historique : </span>
                          {r.historique}
                        </p>
                      )}

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
      <DialogContent className="max-w-xl">
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

          {/* Mêmes critères qu'à la création d'un acquéreur */}
          <CriteresAcquereur avecEntete={false} />

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
