"use client";

import { useState, useTransition } from "react";
import { Check, X, MinusCircle, ShieldCheck, Loader2 } from "lucide-react";
import type { DocStatus, Document } from "@prisma/client";

import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils";
import { setDocStatus } from "@/lib/actions";
import { DOC_STATUS_LABELS } from "@/lib/labels";
import { TRACFIN_DOC_TYPES } from "@/lib/labels";
import { docStats } from "@/lib/domain";

const STATUS_ORDER: DocStatus[] = ["MANQUANT", "RECU", "NON_APPLICABLE"];

const STATUS_STYLE: Record<DocStatus, string> = {
  RECU: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  MANQUANT: "bg-red-100 text-red-700 hover:bg-red-200",
  NON_APPLICABLE: "bg-slate-100 text-slate-500 hover:bg-slate-200",
};

function StatusButton({ doc }: { doc: Document }) {
  const [pending, start] = useTransition();
  const [statut, setStatut] = useState<DocStatus>(doc.statut);

  function cycle() {
    const next =
      STATUS_ORDER[(STATUS_ORDER.indexOf(statut) + 1) % STATUS_ORDER.length];
    setStatut(next);
    start(() => setDocStatus(doc.id, next));
  }

  const Icon =
    statut === "RECU" ? Check : statut === "MANQUANT" ? X : MinusCircle;

  return (
    <button
      onClick={cycle}
      disabled={pending}
      className={cn(
        "inline-flex min-w-[132px] items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        STATUS_STYLE[statut]
      )}
      title="Cliquer pour changer le statut"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {DOC_STATUS_LABELS[statut]}
    </button>
  );
}

export function DocChecklist({ documents }: { documents: Document[] }) {
  const stats = docStats(documents);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              stats.complet ? "bg-emerald-500" : "bg-coral-400"
            )}
            style={{ width: `${stats.pct}%` }}
          />
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {stats.recus}/{stats.total} reçus
        </span>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border">
        {documents.map((doc) => {
          const isTracfin = TRACFIN_DOC_TYPES.includes(doc.type);
          return (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                {isTracfin && (
                  <ShieldCheck
                    className={cn(
                      "h-4 w-4 shrink-0",
                      doc.statut === "RECU"
                        ? "text-emerald-500"
                        : "text-amber-500"
                    )}
                  />
                )}
                <span className="truncate text-sm">
                  {doc.libelle}
                  {isTracfin && (
                    <span className="ml-1.5 text-[10px] font-semibold uppercase text-amber-600">
                      TRACFIN
                    </span>
                  )}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {doc.statut === "RECU" && doc.dateRecu && (
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {formatDateShort(doc.dateRecu)}
                  </span>
                )}
                <StatusButton doc={doc} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
