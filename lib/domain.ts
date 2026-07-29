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

/**
 * Pièces TRACFIN encore manquantes.
 *
 * On raisonne uniquement sur les documents réellement suivis dans la fiche
 * examinée : les pièces demandées à une personne (identité, origine des fonds)
 * ne figurent pas dans la checklist d'un bien, et inversement. Les lister
 * malgré tout afficherait des manques qui n'ont pas lieu d'être.
 */
export function tracfinMissing(docs: DocLike[]): DocType[] {
  return docs
    .filter((d) => TRACFIN_DOC_TYPES.includes(d.type) && d.statut === "MANQUANT")
    .map((d) => d.type);
}

/** true si toutes les pièces TRACFIN suivies dans cette fiche sont réglées. */
export function isTracfinOk(docs: DocLike[]): boolean {
  const suivies = docs.filter((d) => TRACFIN_DOC_TYPES.includes(d.type));
  if (suivies.length === 0) return false;
  // « Non applicable » vaut réglé : la pièce a été écartée en connaissance de cause.
  return suivies.every((d) => d.statut !== "MANQUANT");
}
