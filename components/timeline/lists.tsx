import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  CalendarDays,
} from "lucide-react";
import type { Echange, Evenement, ExchangeType } from "@prisma/client";

import { EVENT_TYPE_LABELS, EXCHANGE_TYPE_LABELS } from "@/lib/labels";
import { formatDateTime, formatDateShort, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
        return (
          <li
            key={ex.id}
            className="flex items-start gap-3 rounded-lg border border-border p-3"
          >
            <div
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                ex.type === "NOTE"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-navy-50 text-navy-600"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {EXCHANGE_TYPE_LABELS[ex.type]}
                </span>
                {ex.direction && (
                  <Badge variant="outline" className="text-[10px]">
                    {ex.direction}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDateShort(ex.date)}
                </span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm">{ex.contenu}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
