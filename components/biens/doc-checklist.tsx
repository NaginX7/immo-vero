"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Check,
  X,
  MinusCircle,
  ShieldCheck,
  Loader2,
  Paperclip,
  FileText,
  Trash2,
  Undo2,
} from "lucide-react";
import { upload } from "@vercel/blob/client";
import type { DocStatus, Document, DocumentFichier } from "@prisma/client";

import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils";
import { attachFichier, deleteFichier, setDocNonApplicable } from "@/lib/actions";
import { DOC_STATUS_LABELS, BIEN_DOC_ORDER } from "@/lib/labels";
import { TRACFIN_DOC_TYPES } from "@/lib/labels";
import { docStats } from "@/lib/domain";
import {
  FICHIER_EXTENSIONS_ACCEPTEES,
  FICHIER_TAILLE_MAX,
  FICHIER_TYPES_ACCEPTES,
  fichierPathname,
  formatTaille,
} from "@/lib/document-fichiers";

export type DocumentAvecFichiers = Document & { fichiers: DocumentFichier[] };

/**
 * Ordre fixe (TRACFIN d'abord) au lieu de l'ordre renvoyé par la base, qui
 * n'est pas stable : les pièces d'une checklist sont créées dans la même
 * transaction (même `createdAt`), donc leur ordre pouvait changer d'un
 * chargement à l'autre, y compris après un simple changement de statut.
 */
function sortDocs<T extends Document>(documents: T[]): T[] {
  return [...documents].sort((a, b) => {
    const ra = BIEN_DOC_ORDER.indexOf(a.type);
    const rb = BIEN_DOC_ORDER.indexOf(b.type);
    const ia = ra === -1 ? BIEN_DOC_ORDER.length : ra;
    const ib = rb === -1 ? BIEN_DOC_ORDER.length : rb;
    if (ia !== ib) return ia - ib;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

const STATUS_STYLE: Record<DocStatus, string> = {
  RECU: "bg-emerald-100 text-emerald-700",
  MANQUANT: "bg-red-100 text-red-700",
  NON_APPLICABLE: "bg-slate-100 text-slate-500",
};

const STATUS_ICON: Record<DocStatus, typeof Check> = {
  RECU: Check,
  MANQUANT: X,
  NON_APPLICABLE: MinusCircle,
};

const actionBtn =
  "inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50";

function DocRow({ doc }: { doc: DocumentAvecFichiers }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const occupe = pending || envoi !== null;

  const isTracfin = TRACFIN_DOC_TYPES.includes(doc.type);
  const StatusIcon = STATUS_ICON[doc.statut];

  async function joindre(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErreur(null);
    try {
      for (const file of Array.from(files)) {
        if (file.size > FICHIER_TAILLE_MAX) {
          throw new Error(`« ${file.name} » dépasse ${formatTaille(FICHIER_TAILLE_MAX)}.`);
        }
        if (file.type && !FICHIER_TYPES_ACCEPTES.includes(file.type)) {
          throw new Error(`« ${file.name} » : format non accepté (PDF, image ou Word).`);
        }
        setEnvoi(file.name);
        const blob = await upload(fichierPathname(doc.id, file.name), file, {
          access: "private",
          handleUploadUrl: "/api/documents/upload",
          clientPayload: doc.id,
          multipart: file.size > 5 * 1024 * 1024,
        });
        await attachFichier(doc.id, blob.pathname, file.name);
      }
    } catch (e) {
      setErreur(
        e instanceof Error && e.message
          ? `Envoi impossible : ${e.message}`
          : "Envoi impossible. Réessayez."
      );
    } finally {
      setEnvoi(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function run(action: () => Promise<void>) {
    setErreur(null);
    start(async () => {
      try {
        await action();
      } catch {
        setErreur("L'opération a échoué. Réessayez.");
      }
    });
  }

  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {isTracfin && (
            <ShieldCheck
              className={cn(
                "h-4 w-4 shrink-0",
                doc.statut === "MANQUANT" ? "text-amber-500" : "text-emerald-500"
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
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
            STATUS_STYLE[doc.statut]
          )}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {DOC_STATUS_LABELS[doc.statut]}
        </span>
      </div>

      {(doc.fichiers.length > 0 || envoi) && (
        <ul className="mt-2 space-y-1">
          {doc.fichiers.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-xs">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <a
                href={`/api/documents/fichiers/${f.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate text-navy-600 hover:underline"
              >
                {f.nom}
              </a>
              <span className="shrink-0 text-muted-foreground">
                {formatTaille(f.taille)}
              </span>
              <button
                type="button"
                disabled={occupe}
                onClick={() => {
                  if (window.confirm(`Supprimer le fichier « ${f.nom} » ?`)) {
                    run(() => deleteFichier(f.id));
                  }
                }}
                className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="Supprimer ce fichier"
                aria-label={`Supprimer ${f.nom}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {envoi && (
            <li className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              <span className="truncate">Envoi de « {envoi} »…</span>
            </li>
          )}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {doc.statut !== "NON_APPLICABLE" && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={FICHIER_EXTENSIONS_ACCEPTEES}
              className="hidden"
              onChange={(e) => joindre(e.target.files)}
            />
            <button
              type="button"
              className={actionBtn}
              disabled={occupe}
              onClick={() => inputRef.current?.click()}
              title="Importer un fichier depuis l'ordinateur"
            >
              {envoi !== null ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
              {doc.statut === "RECU" ? "Ajouter" : "Joindre"}
            </button>
          </>
        )}

        {doc.statut === "MANQUANT" && (
          <button
            type="button"
            className={actionBtn}
            disabled={occupe}
            onClick={() => run(() => setDocNonApplicable(doc.id, true))}
            title="Marquer la pièce comme non applicable"
          >
            <MinusCircle className="h-3.5 w-3.5" />
            Non applicable
          </button>
        )}

        {doc.statut === "NON_APPLICABLE" && (
          <button
            type="button"
            className={actionBtn}
            disabled={occupe}
            onClick={() => run(() => setDocNonApplicable(doc.id, false))}
            title="Remettre la pièce en manquant"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Undo2 className="h-3.5 w-3.5" />
            )}
            Rétablir
          </button>
        )}

        {doc.statut === "RECU" && doc.dateRecu && (
          <span className="ml-auto text-xs text-muted-foreground">
            Reçu le {formatDateShort(doc.dateRecu)}
          </span>
        )}
      </div>

      {erreur && <p className="mt-1.5 text-xs text-red-600">{erreur}</p>}
    </li>
  );
}

export function DocChecklist({ documents }: { documents: DocumentAvecFichiers[] }) {
  const stats = docStats(documents);
  const sorted = useMemo(() => sortDocs(documents), [documents]);

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
        {sorted.map((doc) => (
          <DocRow key={doc.id} doc={doc} />
        ))}
      </ul>
    </div>
  );
}
