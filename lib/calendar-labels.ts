// Libellés du module calendrier, partagés entre les pages, le flux iCal et les
// emails. Fichier séparé car `lib/calendar-actions.ts` est en "use server" et
// ne peut exporter que des fonctions asynchrones.

export const MOTIF_LABELS: Record<string, string> = {
  ESTIMATION: "Estimation",
  VISITE: "Visite",
  CONSEIL: "Conseil",
  AUTRE: "Rendez-vous",
};
