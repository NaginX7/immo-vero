"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  MapPin,
  Tags,
  Handshake,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import type { ContactRole } from "@prisma/client";

import { initials, cn } from "@/lib/utils";
import {
  ajouterAuSegment,
  convertirContactsEnPartenaires,
  supprimerContacts,
  type ConversionIgnoree,
  type SelectionContacts,
} from "@/lib/contact-actions";
import { RoleBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ContactLigne = {
  id: string;
  civilite: string | null;
  nom: string;
  prenom: string | null;
  roles: ContactRole[];
  profession: string | null;
  telephone: string | null;
  email: string | null;
  ville: string | null;
  nbBiens: number;
  nbRecherches: number;
  segments: string[];
};

const checkboxCls = "h-4 w-4 shrink-0 cursor-pointer accent-[hsl(var(--accent))]";

export function ContactsList({
  contacts,
  totalCount,
  filtres,
  segments,
}: {
  contacts: ContactLigne[];
  totalCount: number;
  filtres: Record<string, string>;
  segments: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Set<string>>(new Set());
  // true : l'action porte sur tous les contacts du filtre, pas seulement la page
  const [tousResultats, setTousResultats] = useState(false);
  const [dialog, setDialog] = useState<"segment" | null>(null);
  const [message, setMessage] = useState<{ texte: string; ignores?: ConversionIgnoree[] } | null>(null);
  const [pending, start] = useTransition();

  // La sélection se conserve d'une page à l'autre, mais pas quand les filtres changent.
  const cleFiltres = JSON.stringify(filtres);
  useEffect(() => {
    setSelection(new Set());
    setTousResultats(false);
  }, [cleFiltres]);

  const idsPage = contacts.map((c) => c.id);
  const pageEntiere = idsPage.length > 0 && idsPage.every((id) => selection.has(id));
  const nbSelection = tousResultats ? totalCount : selection.size;
  const cible: SelectionContacts = tousResultats
    ? { filtres }
    : { ids: Array.from(selection) };

  function basculer(id: string) {
    setTousResultats(false);
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function basculerPage() {
    setTousResultats(false);
    setSelection(pageEntiere ? new Set() : new Set(idsPage));
  }

  function vider() {
    setSelection(new Set());
    setTousResultats(false);
  }

  const libelle = `${nbSelection} contact${nbSelection > 1 ? "s" : ""}`;

  function convertir() {
    if (
      !window.confirm(
        `Convertir ${libelle} en partenaire${nbSelection > 1 ? "s" : ""} ? Leurs échanges et événements suivent. Les contacts liés à un bien, une recherche, des pièces ou un rendez-vous ne seront pas convertis.`
      )
    )
      return;
    start(async () => {
      const res = await convertirContactsEnPartenaires(cible);
      vider();
      setMessage({
        texte: `${res.convertis} contact${res.convertis > 1 ? "s" : ""} converti${res.convertis > 1 ? "s" : ""} en partenaire${res.convertis > 1 ? "s" : ""}.`,
        ignores: res.ignores,
      });
      router.refresh();
    });
  }

  function supprimer() {
    if (!window.confirm(`Supprimer définitivement ${libelle} ? Cette action est irréversible.`))
      return;
    start(async () => {
      const res = await supprimerContacts(cible);
      vider();
      setMessage({
        texte: `${res.supprimes} contact${res.supprimes > 1 ? "s" : ""} supprimé${res.supprimes > 1 ? "s" : ""}.`,
      });
      router.refresh();
    });
  }

  return (
    <div>
      {/* Barre de sélection */}
      {contacts.length > 0 && (
        <div className="sticky top-0 z-10 mb-2 flex min-h-[44px] flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <input
            type="checkbox"
            className={checkboxCls}
            checked={pageEntiere}
            onChange={basculerPage}
            aria-label="Sélectionner les contacts de la page"
          />
          {nbSelection === 0 ? (
            <span className="text-sm text-muted-foreground">
              Cochez des contacts pour les ajouter à un segment, les convertir ou les supprimer.
            </span>
          ) : (
            <>
              <span className="text-sm font-medium">{libelle} sélectionné{nbSelection > 1 ? "s" : ""}</span>
              {pageEntiere && !tousResultats && totalCount > idsPage.length && (
                <button
                  type="button"
                  className="text-sm text-navy-600 underline-offset-2 hover:underline"
                  onClick={() => setTousResultats(true)}
                >
                  Sélectionner les {totalCount} contacts du filtre
                </button>
              )}
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" disabled={pending} onClick={() => setDialog("segment")}>
                  <Tags className="h-4 w-4" /> Ajouter à un segment
                </Button>
                <Button size="sm" variant="outline" disabled={pending} onClick={convertir}>
                  <Handshake className="h-4 w-4" /> Convertir en partenaire
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={supprimer}
                  className="text-destructive hover:bg-red-50 hover:text-destructive"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Supprimer
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={vider} aria-label="Annuler la sélection">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {message && (
        <div className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-emerald-800">{message.texte}</p>
            <button type="button" onClick={() => setMessage(null)} aria-label="Fermer">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {message.ignores && message.ignores.length > 0 && (
            <div className="mt-2 text-amber-800">
              <p>Non convertis ({message.ignores.length}) :</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {message.ignores.map((i) => (
                  <li key={i.id}>
                    <Link href={`/contacts/${i.id}`} className="font-medium hover:underline">
                      {i.nom}
                    </Link>{" "}
                    — {i.raisons.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {contacts.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Aucun contact ne correspond à votre recherche.
          </CardContent>
        </Card>
      )}

      {contacts.length > 0 && (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {contacts.map((c) => {
            const fullName = `${c.prenom ?? ""} ${c.nom}`.trim();
            const coche = tousResultats || selection.has(c.id);
            return (
              <div
                key={c.id}
                className={cn(
                  "flex items-center gap-3 pl-4 transition-colors hover:bg-muted",
                  coche && "bg-powder-50/60"
                )}
              >
                <input
                  type="checkbox"
                  className={checkboxCls}
                  checked={coche}
                  onChange={() => basculer(c.id)}
                  aria-label={`Sélectionner ${fullName}`}
                />
                <Link
                  href={`/contacts/${c.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4 py-3 pr-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-100 text-sm font-semibold text-navy-700">
                    {initials(fullName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-navy-800">
                        {c.civilite ? `${c.civilite} ` : ""}
                        {fullName}
                      </p>
                      <div className="hidden gap-1 sm:flex">
                        {c.roles.map((r) => (
                          <RoleBadge key={r} role={r} />
                        ))}
                      </div>
                    </div>
                    {(c.profession || c.segments.length > 0) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {c.profession}
                        {c.profession && c.segments.length > 0 && " · "}
                        {c.segments.length > 0 && (
                          <span className="text-navy-600">{c.segments.join(", ")}</span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="hidden shrink-0 items-center gap-6 text-sm text-muted-foreground md:flex">
                    {c.telephone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> {c.telephone}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex w-52 items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </span>
                    )}
                    {c.ville && (
                      <span className="flex w-32 items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {c.ville}
                      </span>
                    )}
                  </div>

                  <div className="hidden shrink-0 text-right text-xs text-muted-foreground xl:block">
                    {c.nbBiens} bien(s) · {c.nbRecherches} rech.
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <SegmentDialog
        open={dialog === "segment"}
        onOpenChange={(o) => setDialog(o ? "segment" : null)}
        segments={segments}
        libelle={libelle}
        onValider={async (segment) => {
          const res = await ajouterAuSegment(cible, segment);
          if (!res.ok) return res.error;
          const nom =
            "nom" in segment ? segment.nom.trim() : segments.find((s) => s.id === segment.id)?.nom;
          vider();
          setDialog(null);
          setMessage({ texte: `${res.ajoutes} contact${res.ajoutes > 1 ? "s" : ""} ajouté${res.ajoutes > 1 ? "s" : ""} au segment « ${nom} ».` });
          router.refresh();
          return null;
        }}
      />
    </div>
  );
}

function SegmentDialog({
  open,
  onOpenChange,
  segments,
  libelle,
  onValider,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segments: { id: string; nom: string }[];
  libelle: string;
  onValider: (segment: { id: string } | { nom: string }) => Promise<string | null>;
}) {
  const NOUVEAU = "__nouveau__";
  const [choix, setChoix] = useState(segments[0]?.id ?? NOUVEAU);
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter {libelle} à un segment</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setErreur(null);
            start(async () => {
              const err = await onValider(choix === NOUVEAU ? { nom } : { id: choix });
              if (err) setErreur(err);
              else setNom("");
            });
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-xs">Segment</Label>
            <NativeSelect value={choix} onChange={(e) => setChoix(e.target.value)}>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
              <option value={NOUVEAU}>+ Nouveau segment…</option>
            </NativeSelect>
          </div>
          {choix === NOUVEAU && (
            <div className="space-y-1.5">
              <Label className="text-xs">Nom du nouveau segment</Label>
              <Input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex. Acquéreurs Saverne"
                autoFocus
              />
            </div>
          )}
          {erreur && <p className="text-sm text-red-600">{erreur}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending || (choix === NOUVEAU && !nom.trim())}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
