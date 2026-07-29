// Synchronisation iCal : génération du flux d'export et lecture des agendas
// externes (Google Agenda…) dont les événements bloquent les créneaux.

import ical from "node-ical";

export type Occupation = { debut: Date; fin: Date };

// --- Export ---------------------------------------------------------------

/** Échappe les caractères réservés du format iCalendar (RFC 5545). */
function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Formate une date en UTC : 20260731T093000Z */
function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const encodeur = new TextEncoder();

/**
 * Replie les lignes à 75 OCTETS, comme l'exige la RFC 5545.
 *
 * Le comptage se fait en octets et non en caractères : en UTF-8 un accent
 * occupe 2 octets, une ligne de 75 caractères accentués en ferait 150 et serait
 * rejetée par certains agendas. Le parcours par point de code garantit aussi
 * qu'aucun caractère n'est coupé en deux.
 */
function foldLine(line: string): string {
  if (encodeur.encode(line).length <= 75) return line;

  const lignes: string[] = [];
  let courante = "";
  let octets = 0;

  for (const ch of line) {
    const taille = encodeur.encode(ch).length;
    if (octets + taille > 75) {
      lignes.push(courante);
      // Une ligne de continuation commence par une espace (comptée elle aussi).
      courante = " " + ch;
      octets = 1 + taille;
    } else {
      courante += ch;
      octets += taille;
    }
  }
  if (courante !== "") lignes.push(courante);
  return lignes.join("\r\n");
}

export type BookingPourIcs = {
  id: string;
  debut: Date;
  fin: Date;
  statut: string;
  nom: string;
  prenom: string | null;
  email: string;
  telephone: string | null;
  message: string | null;
  adresseBien: string | null;
  updatedAt?: Date;
};

/** Construit le flux .ics des rendez-vous, pour abonnement depuis Google Agenda. */
export function buildIcs(
  bookings: BookingPourIcs[],
  opts: { nomCalendrier: string }
): string {
  const lignes: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//L'Immobiliere de Saverne//CRM//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(opts.nomCalendrier)}`,
    "X-WR-TIMEZONE:Europe/Paris",
    // Intervalle de rafraîchissement suggéré aux clients (Google l'ignore
    // partiellement mais Apple/Outlook le respectent).
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];

  for (const b of bookings) {
    const qui = `${b.prenom ?? ""} ${b.nom}`.trim();
    const enAttente = b.statut === "EN_ATTENTE";

    const description = [
      `Contact : ${qui}`,
      `Email : ${b.email}`,
      b.telephone ? `Téléphone : ${b.telephone}` : null,
      b.adresseBien ? `Bien : ${b.adresseBien}` : null,
      b.message ? `Message : ${b.message}` : null,
      enAttente ? "⚠ En attente de confirmation du client" : "Confirmé",
    ]
      .filter(Boolean)
      .join("\n");

    lignes.push(
      "BEGIN:VEVENT",
      `UID:${b.id}@immobiliere-saverne`,
      `DTSTAMP:${toIcsDate(b.updatedAt ?? new Date())}`,
      `DTSTART:${toIcsDate(b.debut)}`,
      `DTEND:${toIcsDate(b.fin)}`,
      `SUMMARY:${escapeIcs(
        `${enAttente ? "[À confirmer] " : ""}RDV ${qui}${
          b.adresseBien ? ` — ${b.adresseBien}` : ""
        }`
      )}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      // Champ LOCATION : l'agenda propose alors l'itinéraire vers le bien.
      ...(b.adresseBien ? [`LOCATION:${escapeIcs(b.adresseBien)}`] : []),
      // Une demande non confirmée reste "provisoire" dans l'agenda.
      `STATUS:${enAttente ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT"
    );
  }

  lignes.push("END:VCALENDAR");
  return lignes.map(foldLine).join("\r\n") + "\r\n";
}

// --- Import ---------------------------------------------------------------

/** Convertit l'URL d'abonnement en URL récupérable (webcal:// → https://). */
export function normaliserUrlIcal(url: string): string {
  const u = url.trim();
  if (u.toLowerCase().startsWith("webcal://")) return "https://" + u.slice(9);
  return u;
}

export type LectureAgenda = {
  occupations: Occupation[];
  erreur?: string;
};

/**
 * Récupère un flux iCal et en extrait les périodes occupées, récurrences
 * comprises, dans la fenêtre [debut, fin].
 *
 * Ne lève jamais : une erreur réseau ou un flux illisible renvoie une liste
 * vide et un message — un agenda injoignable ne doit pas empêcher la
 * réservation.
 */
export async function lireAgendaExterne(
  url: string,
  debut: Date,
  fin: Date,
  opts: { cacheSeconds?: number; timeoutMs?: number } = {}
): Promise<LectureAgenda> {
  const { cacheSeconds = 300, timeoutMs = 8000 } = opts;

  let texte: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(normaliserUrlIcal(url), {
      signal: controller.signal,
      headers: { Accept: "text/calendar, text/plain, */*" },
      ...(cacheSeconds > 0
        ? { next: { revalidate: cacheSeconds } }
        : { cache: "no-store" as const }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { occupations: [], erreur: `Réponse ${res.status} de l'agenda.` };
    }
    texte = await res.text();
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "Délai dépassé lors de la récupération de l'agenda."
        : e instanceof Error
        ? e.message
        : "Récupération impossible.";
    return { occupations: [], erreur: msg };
  }

  if (!texte.includes("BEGIN:VCALENDAR")) {
    return {
      occupations: [],
      erreur:
        "Le contenu récupéré n'est pas un calendrier iCal (vérifiez l'adresse).",
    };
  }

  try {
    return { occupations: extraireOccupations(texte, debut, fin) };
  } catch (e) {
    return {
      occupations: [],
      erreur: e instanceof Error ? e.message : "Lecture du calendrier impossible.",
    };
  }
}

/** Extrait les périodes occupées d'un contenu iCal, récurrences développées. */
export function extraireOccupations(
  contenuIcs: string,
  debut: Date,
  fin: Date
): Occupation[] {
  const data = ical.parseICS(contenuIcs);
  const occupations: Occupation[] = [];

  for (const cle of Object.keys(data)) {
    const ev = data[cle];
    if (!ev || ev.type !== "VEVENT") continue;

    // On ignore les événements annulés ou marqués "disponible".
    const statut = String(
      (ev as { status?: unknown }).status ?? ""
    ).toUpperCase();
    if (statut === "CANCELLED") continue;
    const transparence = String(
      (ev as { transparency?: unknown }).transparency ?? ""
    ).toUpperCase();
    if (transparence === "TRANSPARENT") continue;

    if ((ev as { rrule?: unknown }).rrule) {
      // Événement récurrent : on développe les occurrences de la fenêtre.
      try {
        const instances = ical.expandRecurringEvent(ev, { from: debut, to: fin });
        for (const inst of instances) {
          const d = new Date(inst.start);
          const f = new Date(inst.end);
          if (estValide(d, f)) occupations.push({ debut: d, fin: f });
        }
        continue;
      } catch {
        // Récurrence illisible : on retombe sur l'occurrence de base.
      }
    }

    const d = ev.start ? new Date(ev.start) : null;
    const f = ev.end ? new Date(ev.end) : null;
    if (d && f && estValide(d, f)) occupations.push({ debut: d, fin: f });
  }

  // On ne garde que ce qui chevauche la fenêtre demandée.
  return occupations.filter((o) => o.fin > debut && o.debut < fin);
}

function estValide(d: Date, f: Date): boolean {
  return (
    !Number.isNaN(d.getTime()) && !Number.isNaN(f.getTime()) && f.getTime() > d.getTime()
  );
}
