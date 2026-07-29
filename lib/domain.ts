// Helpers de domaine purs (utilisables côté serveur et client).

import type { DocStatus, DocType } from "@prisma/client";
import { TRACFIN_DOC_TYPES } from "./labels";

export type DocLike = { type: DocType; statut: DocStatus };

/** Statistiques d'une checklist documentaire. */
export function docStats(docs: DocLike[]) {
  const applicables = docs.filter((d) => d.statut !== "NON_APPLICABLE");
  const recus = applicables.filter((d) => d.statut === "RECU").length;
  const total = applicables.length;
  const manquants = total - recus;
  const pct = total === 0 ? 100 : Math.round((recus / total) * 100);
  return { recus, total, manquants, pct, complet: manquants === 0 };
}

/** Pièces TRACFIN encore manquantes parmi une liste de documents. */
export function tracfinMissing(docs: DocLike[]): DocType[] {
  const present = new Set(
    docs.filter((d) => d.statut === "RECU").map((d) => d.type)
  );
  return TRACFIN_DOC_TYPES.filter((t) => {
    // On ne considère TRACFIN incomplet que si le type figure dans la liste
    // ET n'est pas reçu (s'il n'est pas du tout présent, on le compte manquant).
    return !present.has(t);
  });
}

/** true si toutes les pièces TRACFIN présentes dans la checklist sont reçues. */
export function isTracfinOk(docs: DocLike[]): boolean {
  const relevant = docs.filter((d) => TRACFIN_DOC_TYPES.includes(d.type));
  if (relevant.length === 0) return false;
  return relevant.every((d) => d.statut === "RECU");
}
