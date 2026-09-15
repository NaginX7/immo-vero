"use client";

import { useTransition } from "react";
import { Handshake, Loader2, UserRound, X } from "lucide-react";

import {
  convertirContactEnPartenaire,
  convertirPartenaireEnContact,
  retirerDuSegment,
} from "@/lib/contact-actions";
import { Button } from "@/components/ui/button";

export function ConvertirEnPartenaireButton({ contactId }: { contactId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Convertir ce contact en partenaire ? Ses échanges et événements suivent.")) return;
        start(async () => {
          const res = await convertirContactEnPartenaire(contactId);
          if (res && !res.ok) {
            window.alert(
              `Conversion impossible. Ce contact a des liens qu'un partenaire ne peut pas garder : ${res.raisons.join(", ")}.`
            );
          }
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Handshake className="h-4 w-4" />}
      Convertir en partenaire
    </Button>
  );
}

export function ConvertirEnContactButton({ partenaireId }: { partenaireId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Convertir ce partenaire en contact ? Ses échanges et événements suivent.")) return;
        start(() => convertirPartenaireEnContact(partenaireId));
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
      Convertir en contact
    </Button>
  );
}

export function SegmentBadge({
  contactId,
  segment,
}: {
  contactId: string;
  segment: { id: string; nom: string };
}) {
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-powder-100 py-0.5 pl-2.5 pr-1 text-xs font-medium text-navy-700">
      {segment.nom}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => retirerDuSegment(contactId, segment.id))}
        className="rounded-full p-0.5 hover:bg-powder-200 disabled:opacity-50"
        title="Retirer de ce segment"
        aria-label={`Retirer du segment ${segment.nom}`}
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
      </button>
    </span>
  );
}
