// Moteur de créneaux — génération des disponibilités de réservation.
// Fonctions pures : testables et utilisables côté serveur comme client.

export type Rule = {
  jourSemaine: number; // 0 = dimanche … 6 = samedi
  heureDebut: string; // "09:00"
  heureFin: string; // "12:00"
  actif: boolean;
};

export type Closure = { debut: Date; fin: Date };

export type Busy = { debut: Date; fin: Date };

export type SlotSettings = {
  dureeCreneauMin: number;
  preavisHeures: number;
  horizonJours: number;
  pauseMin: number;
};

export type Slot = { debut: Date; fin: Date };

/** "09:30" -> 570 (minutes depuis minuit). Renvoie null si invalide. */
export function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** 570 -> "09:30" */
export function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Date au format "YYYY-MM-DD" en heure locale. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" -> Date locale à minuit. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Génère les créneaux disponibles sur l'horizon configuré.
 * Retire : le passé + préavis, les fermetures, et les RDV déjà pris.
 */
export function generateSlots(params: {
  rules: Rule[];
  closures: Closure[];
  busy: Busy[];
  settings: SlotSettings;
  now?: Date;
}): Slot[] {
  const { rules, closures, busy, settings } = params;
  const now = params.now ?? new Date();

  const duree = Math.max(5, settings.dureeCreneauMin);
  const pause = Math.max(0, settings.pauseMin);
  const pas = duree + pause;

  // Borne basse : maintenant + préavis. Borne haute : horizon.
  const minStart = new Date(now.getTime() + settings.preavisHeures * 3600_000);
  const maxDay = new Date(now);
  maxDay.setHours(23, 59, 59, 999);
  maxDay.setDate(maxDay.getDate() + Math.max(0, settings.horizonJours));

  const activeRules = rules.filter((r) => r.actif);
  const slots: Slot[] = [];

  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= maxDay) {
    const dow = cursor.getDay();
    for (const rule of activeRules) {
      if (rule.jourSemaine !== dow) continue;
      const start = parseHHMM(rule.heureDebut);
      const end = parseHHMM(rule.heureFin);
      if (start === null || end === null || end <= start) continue;

      for (let m = start; m + duree <= end; m += pas) {
        const debut = new Date(cursor);
        debut.setHours(0, m, 0, 0);
        const fin = new Date(debut.getTime() + duree * 60_000);

        if (debut < minStart) continue;
        if (debut > maxDay) continue;
        if (closures.some((c) => overlaps(debut, fin, c.debut, c.fin))) continue;
        if (busy.some((b) => overlaps(debut, fin, b.debut, b.fin))) continue;

        slots.push({ debut, fin });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  slots.sort((a, b) => a.debut.getTime() - b.debut.getTime());
  return slots;
}

/** Regroupe les créneaux par jour ("YYYY-MM-DD" -> créneaux). */
export function groupSlotsByDay(slots: Slot[]): Map<string, Slot[]> {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = toDateKey(s.debut);
    const list = map.get(key);
    if (list) list.push(s);
    else map.set(key, [s]);
  }
  return map;
}

export const JOURS_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

/** Ordre d'affichage : lundi → dimanche. */
export const JOURS_ORDER = [1, 2, 3, 4, 5, 6, 0];
