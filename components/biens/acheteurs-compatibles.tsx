"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Users,
  Check,
  X,
  Minus,
  Phone,
  Mail,
  ArrowUpRight,
  Search,
} from "lucide-react";

import type { CritereResultat } from "@/lib/matching";
import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type AcheteurMatch = {
  contactId: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  rechercheTitre: string | null;
  criteres: CritereResultat[];
  manques: string[];
  respectes: number;
  evalues: number;
  compatible: boolean;
};

function CritereChip({ c }: { c: CritereResultat }) {
  const Icon = c.ok === true ? Check : c.ok === false ? X : Minus;
  return (
    <span
      title={c.detail}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        c.ok === true && "bg-emerald-100 text-emerald-800",
        c.ok === false && "bg-red-100 text-red-700",
        c.ok === null && "bg-muted text-muted-foreground"
      )}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function Ligne({ m }: { m: AcheteurMatch }) {
  const nomComplet = `${m.prenom ?? ""} ${m.nom}`.trim();
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-700">
            {initials(nomComplet)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-navy-800">
              {nomComplet}
            </p>
            {m.rechercheTitre && (
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <Search className="h-3 w-3 shrink-0" />
                {m.rechercheTitre}
              </p>
            )}
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {m.telephone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {m.telephone}
                </span>
              )}
              {m.email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" /> {m.email}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/contacts/${m.contactId}`}
          className="shrink-0 text-muted-foreground transition-colors hover:text-coral-600"
          aria-label="Ouvrir la fiche contact"
          title="Ouvrir la fiche contact"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {m.criteres.map((c) => (
          <CritereChip key={c.label} c={c} />
        ))}
      </div>
    </div>
  );
}

export function AcheteursCompatibles({
  matches,
}: {
  matches: AcheteurMatch[];
}) {
  const [open, setOpen] = useState(false);

  const compatibles = matches.filter((m) => m.compatible);
  const presque = matches.filter(
    (m) => !m.compatible && m.manques.length === 1
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4" />
          Acheteurs compatibles
          {compatibles.length > 0 && (
            <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
              {compatibles.length}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-coral-500" />
            Acheteurs compatibles
          </DialogTitle>
        </DialogHeader>

        {matches.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun acquéreur n&apos;a de fiche recherche renseignée.
          </p>
        ) : (
          <div className="space-y-5">
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tous les critères respectés
                {compatibles.length > 0 && ` (${compatibles.length})`}
              </h4>
              {compatibles.length === 0 ? (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  Aucun acquéreur ne correspond pleinement à ce bien.
                </p>
              ) : (
                <div className="space-y-2">
                  {compatibles.map((m) => (
                    <Ligne key={m.contactId + m.rechercheTitre} m={m} />
                  ))}
                </div>
              )}
            </section>

            {presque.length > 0 && (
              <section>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Presque — un seul critère hors cible ({presque.length})
                </h4>
                <div className="space-y-2">
                  {presque.map((m) => (
                    <div key={m.contactId + m.rechercheTitre}>
                      <Ligne m={m} />
                      <p className="mt-1 pl-1 text-xs text-amber-700">
                        À écarter ou à négocier : {m.manques.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              Les critères non renseignés dans une fiche recherche sont ignorés
              (affichés en gris).
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
