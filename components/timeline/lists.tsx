import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  CalendarDays,
  ChevronRight,
  Pin,
} from "lucide-react";
import type { Echange, Evenement, ExchangeType } from "@prisma/client";

import { EVENT_TYPE_LABELS, EXCHANGE_TYPE_LABELS } from "@/lib/labels";
import { formatDateTime, formatDateShort, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EchangeActions } from "@/components/timeline/echange-actions";

const exchangeIcon: Record<ExchangeType, typeof Mail> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  APPEL: Phone,
  NOTE: StickyNote,
};

type EvenementWithLinks = Evenement & {
  bien?: { id: string; titre: string } | null;
  contact?: { id: string; nom: string; prenom: string | null } | null;
};

export function EvenementList({ events }: { events: EvenementWithLinks[] }) {
  if (events.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aucun événement pour l&apos;instant.
      </p>
    );
  }
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((ev) => (
        <li key={ev.id} className="relative">
          <span className="absolute -left-[26px] flex h-4 w-4 items-center justify-center rounded-full bg-coral-100 ring-4 ring-background">
            <CalendarDays className="h-2.5 w-2.5 text-coral-600" />
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">{EVENT_TYPE_LABELS[ev.type]}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(ev.date)}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium">{ev.titre}</p>
          {ev.description && (
            <p className="text-sm text-muted-foreground">{ev.description}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-3 text-xs">
            {ev.bien && (
              <Link
                href={`/biens/${ev.bien.id}`}
                className="text-muted-foreground hover:text-coral-600"
              >
                🏠 {ev.bien.titre}
              </Link>
            )}
            {ev.contact && (
              <Link
                href={`/contacts/${ev.contact.id}`}
                className="text-muted-foreground hover:text-coral-600"
              >
                👤 {`${ev.contact.prenom ?? ""} ${ev.contact.nom}`.trim()}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

type EchangeWithLinks = Echange & {
  bien?: { id: string; titre: string } | null;
  contact?: { id: string; nom: string; prenom: string | null } | null;
};

/**
 * Sépare l'objet du corps. Les emails importés commencent par « Objet : … »,
 * parfois précédé d'une ligne « À : … » (envois depuis l'outil, import Gmail) ;
 * cette ligne de destinataire reste dans le corps. Les notes saisies à la main
 * n'ont pas d'objet, on prend alors leur première ligne.
 */
function decouperEchange(contenu: string) {
  const lignes = contenu.split("\n");
  const iObjet = lignes.findIndex((l, i) => i <= 1 && /^Objet\s*:/i.test(l.trim()));
  if (iObjet !== -1) {
    const objet = lignes[iObjet].trim().replace(/^Objet\s*:\s*/i, "");
    const reste = lignes.filter((_, i) => i !== iObjet).join("\n").trim();
    return { objet: objet || "(sans objet)", corps: reste };
  }
  const premiere = (lignes[0] ?? "").trim();
  const reste = lignes.slice(1).join("\n").trim();
  return { objet: premiere || "(sans objet)", corps: reste };
}

export function EchangeList({ echanges }: { echanges: EchangeWithLinks[] }) {
  if (echanges.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aucun échange enregistré.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {echanges.map((ex) => {
        const Icon = exchangeIcon[ex.type];
        const { objet, corps } = decouperEchange(ex.contenu);
        return (
          <li key={ex.id}>
            {/* <details> plutôt qu'un état React : le repli reste natif, donc
                utilisable dans un composant serveur et sans JavaScript. */}
            <details
              className={cn(
                "group rounded-lg border",
                ex.epingleAt ? "border-coral-200 bg-powder-50/60" : "border-border"
              )}
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3 hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    ex.type === "NOTE"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-navy-50 text-navy-600"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {ex.direction ? (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {ex.direction}
                    </Badge>
                  ) : (
                    <span className="shrink-0 text-xs font-medium">
                      {EXCHANGE_TYPE_LABELS[ex.type]}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateShort(ex.date)}
                  </span>
                  {ex.epingleAt && (
                    <Pin className="h-3.5 w-3.5 shrink-0 fill-coral-500 text-coral-600" aria-label="Épinglé" />
                  )}
                  <span className="truncate text-sm">{objet}</span>
                </div>
                <EchangeActions id={ex.id} epingle={!!ex.epingleAt} />
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <div className="border-t border-border px-3 py-2 pl-14">
                {corps ? (
                  <p className="whitespace-pre-wrap text-sm">{corps}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    Aucun contenu enregistré pour cet échange.
                  </p>
                )}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
