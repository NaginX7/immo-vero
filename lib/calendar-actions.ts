"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { generateSlots, parseHHMM } from "@/lib/slots";
import { lireAgendaExterne, normaliserUrlIcal } from "@/lib/ical";
import { buildConfirmationEmail, piecesTexte } from "@/lib/emails-rdv";
import { requireAuth } from "@/lib/auth-guard";

const SETTINGS_ID = "default";

/** Statuts qui occupent réellement un créneau (une demande non confirmée le bloque aussi). */
const STATUTS_OCCUPANTS = ["EN_ATTENTE", "CONFIRME"] as const;

/** URL de base pour les liens envoyés par email. */
function getBaseUrl(): string {
  const fromEnv = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const h = headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

/** URL de base des liens de rendez-vous envoyés aux clients (domaine public). */
function getPublicUrl(): string {
  const fromEnv = process.env.PUBLIC_URL?.trim();
  return fromEnv ? fromEnv.replace(/\/+$/, "") : getBaseUrl();
}

function formatQuand(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(d);
}

/** Réglages du calendrier, créés à la volée si absents. */
export async function getCalendarSettings() {
  const existing = await prisma.calendarSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  if (existing) return existing;
  return prisma.calendarSettings.create({ data: { id: SETTINGS_ID } });
}

// --- Synchronisation iCal -------------------------------------------------

/** Jeton du flux d'abonnement, créé au premier accès. */
export async function getIcsToken(): Promise<string> {
  await requireAuth();
  const settings = await getCalendarSettings();
  if (settings.icsToken) return settings.icsToken;

  const token = randomBytes(24).toString("base64url");
  await prisma.calendarSettings.update({
    where: { id: SETTINGS_ID },
    data: { icsToken: token },
  });
  return token;
}

/** Régénère le jeton : l'ancien lien d'abonnement cesse aussitôt de fonctionner. */
export async function regenerateIcsToken(): Promise<string> {
  await requireAuth();
  const token = randomBytes(24).toString("base64url");
  await prisma.calendarSettings.update({
    where: { id: SETTINGS_ID },
    data: { icsToken: token },
  });
  revalidatePath("/calendrier");
  return token;
}

/** URL complète du flux d'abonnement. */
export async function getIcsUrl(): Promise<string> {
  await requireAuth();
  const token = await getIcsToken();
  return `${getBaseUrl()}/api/ical?token=${token}`;
}

export async function addExternalCalendar(
  fd: FormData
): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();
  const nom = String(fd.get("nom") ?? "").trim() || "Agenda externe";
  const urlBrute = String(fd.get("url") ?? "").trim();

  if (urlBrute === "") {
    return { ok: false, error: "Adresse du calendrier manquante." };
  }

  const url = normaliserUrlIcal(urlBrute);
  if (!/^https?:\/\//i.test(url)) {
    return {
      ok: false,
      error: "L'adresse doit commencer par https:// ou webcal://",
    };
  }

  // On valide tout de suite : mieux vaut refuser une adresse erronée que
  // découvrir plus tard que les créneaux ne sont pas bloqués.
  const debut = new Date();
  const fin = new Date();
  fin.setDate(fin.getDate() + 60);
  const lecture = await lireAgendaExterne(url, debut, fin, { cacheSeconds: 0 });
  if (lecture.erreur) {
    return { ok: false, error: lecture.erreur };
  }

  await prisma.externalCalendar.create({
    data: {
      nom,
      url,
      lastSyncAt: new Date(),
      nbEvenements: lecture.occupations.length,
    },
  });

  revalidatePath("/calendrier");
  revalidatePath("/rdv");
  return { ok: true };
}

export async function deleteExternalCalendar(id: string) {
  await requireAuth();
  await prisma.externalCalendar.delete({ where: { id } });
  revalidatePath("/calendrier");
  revalidatePath("/rdv");
}

export async function toggleExternalCalendar(id: string, actif: boolean) {
  await requireAuth();
  await prisma.externalCalendar.update({ where: { id }, data: { actif } });
  revalidatePath("/calendrier");
  revalidatePath("/rdv");
}

/** Relit tous les agendas externes et met à jour leur état de synchronisation. */
export async function syncExternalCalendars(): Promise<{
  ok: boolean;
  total: number;
}> {
  await requireAuth();
  const agendas = await prisma.externalCalendar.findMany({
    where: { actif: true },
  });

  const debut = new Date();
  const fin = new Date();
  fin.setDate(fin.getDate() + 90);

  let total = 0;
  for (const a of agendas) {
    const lecture = await lireAgendaExterne(a.url, debut, fin, {
      cacheSeconds: 0,
    });
    total += lecture.occupations.length;
    await prisma.externalCalendar.update({
      where: { id: a.id },
      data: {
        lastSyncAt: new Date(),
        lastError: lecture.erreur ?? null,
        nbEvenements: lecture.occupations.length,
      },
    });
  }

  revalidatePath("/calendrier");
  revalidatePath("/rdv");
  return { ok: true, total };
}

/**
 * Périodes occupées issues des agendas externes.
 *
 * Utilisée par la page publique et par la validation d'une réservation. Un
 * agenda injoignable est ignoré : mieux vaut proposer un créneau en trop que
 * rendre la prise de rendez-vous impossible.
 */
export async function getBusyFromExternalCalendars(
  horizonJours: number,
  opts: { fresh?: boolean } = {}
): Promise<{ debut: Date; fin: Date }[]> {
  const agendas = await prisma.externalCalendar.findMany({
    where: { actif: true },
    select: { url: true },
  });
  if (agendas.length === 0) return [];

  const debut = new Date();
  const fin = new Date();
  fin.setDate(fin.getDate() + horizonJours + 1);

  const lectures = await Promise.all(
    agendas.map((a) =>
      lireAgendaExterne(a.url, debut, fin, {
        // À la réservation on relit sans cache pour éviter tout doublon.
        cacheSeconds: opts.fresh ? 0 : 300,
      })
    )
  );

  return lectures.flatMap((l) => l.occupations);
}

// --- Réglages -------------------------------------------------------------

export async function updateCalendarSettings(fd: FormData) {
  await requireAuth();
  const num = (k: string, fallback: number) => {
    const v = fd.get(k);
    const n = typeof v === "string" ? parseInt(v, 10) : NaN;
    return Number.isNaN(n) ? fallback : n;
  };
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };

  await prisma.calendarSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID },
    update: {},
  });

  await prisma.calendarSettings.update({
    where: { id: SETTINGS_ID },
    data: {
      dureeCreneauMin: Math.max(5, num("dureeCreneauMin", 60)),
      preavisHeures: Math.max(0, num("preavisHeures", 24)),
      horizonJours: Math.max(1, num("horizonJours", 30)),
      pauseMin: Math.max(0, num("pauseMin", 0)),
      titrePublic: str("titrePublic") ?? "Prendre rendez-vous",
      messagePublic: str("messagePublic"),
      actif: fd.get("actif") === "on" || fd.get("actif") === "true",
    },
  });
  revalidatePath("/calendrier");
  revalidatePath("/rdv");
}

// --- Règles de disponibilité ---------------------------------------------

/**
 * Crée ou met à jour une plage de disponibilité.
 * En création, `jours` permet d'appliquer la même plage à plusieurs jours.
 */
export async function upsertAvailabilityRule(input: {
  id?: string;
  jours?: number[];
  heureDebut: string;
  heureFin: string;
  actif?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();
  const debut = input.heureDebut?.trim() ?? "";
  const fin = input.heureFin?.trim() ?? "";
  const d = parseHHMM(debut);
  const f = parseHHMM(fin);
  if (d === null || f === null) {
    return { ok: false, error: "Horaires invalides." };
  }
  if (f <= d) {
    return { ok: false, error: "L'heure de fin doit suivre l'heure de début." };
  }

  if (input.id) {
    await prisma.availabilityRule.update({
      where: { id: input.id },
      data: {
        heureDebut: debut,
        heureFin: fin,
        ...(input.actif === undefined ? {} : { actif: input.actif }),
      },
    });
  } else {
    const jours = (input.jours ?? []).filter((j) => j >= 0 && j <= 6);
    if (jours.length === 0) return { ok: false, error: "Aucun jour choisi." };
    await prisma.availabilityRule.createMany({
      data: jours.map((jourSemaine) => ({
        jourSemaine,
        heureDebut: debut,
        heureFin: fin,
      })),
    });
  }

  revalidatePath("/calendrier");
  revalidatePath("/rdv");
  return { ok: true };
}

export async function toggleAvailabilityRule(id: string, actif: boolean) {
  await requireAuth();
  await prisma.availabilityRule.update({ where: { id }, data: { actif } });
  revalidatePath("/calendrier");
  revalidatePath("/rdv");
}

export async function deleteAvailabilityRule(id: string) {
  await requireAuth();
  await prisma.availabilityRule.delete({ where: { id } });
  revalidatePath("/calendrier");
  revalidatePath("/rdv");
}

// --- Fermetures ----------------------------------------------------------

export async function addClosure(fd: FormData) {
  await requireAuth();
  const journee = fd.get("journee") === "on" || fd.get("journee") === "true";
  const dateStr = String(fd.get("date") ?? "").trim();
  if (!dateStr) return { ok: false, error: "Date requise." };

  let debut: Date;
  let fin: Date;
  if (journee) {
    debut = new Date(`${dateStr}T00:00:00`);
    fin = new Date(`${dateStr}T23:59:59`);
  } else {
    const hd = String(fd.get("heureDebut") ?? "").trim();
    const hf = String(fd.get("heureFin") ?? "").trim();
    if (parseHHMM(hd) === null || parseHHMM(hf) === null) {
      return { ok: false, error: "Horaires invalides." };
    }
    debut = new Date(`${dateStr}T${hd}:00`);
    fin = new Date(`${dateStr}T${hf}:00`);
  }
  if (Number.isNaN(debut.getTime()) || fin <= debut) {
    return { ok: false, error: "Plage invalide." };
  }

  const motif = fd.get("motif");
  await prisma.slotClosure.create({
    data: {
      debut,
      fin,
      journee,
      motif: typeof motif === "string" && motif.trim() ? motif.trim() : null,
    },
  });
  revalidatePath("/calendrier");
  revalidatePath("/rdv");
  return { ok: true };
}

export async function deleteClosure(id: string) {
  await requireAuth();
  await prisma.slotClosure.delete({ where: { id } });
  revalidatePath("/calendrier");
  revalidatePath("/rdv");
}

// --- Réservations ---------------------------------------------------------

export async function cancelBooking(id: string) {
  await requireAuth();
  const booking = await prisma.booking.update({
    where: { id },
    data: { statut: "ANNULE", annuleAt: new Date() },
  });
  if (booking.evenementId) {
    await prisma.evenement
      .delete({ where: { id: booking.evenementId } })
      .catch(() => undefined);
  }
  revalidatePath("/calendrier");
  revalidatePath("/rdv");
  revalidatePath("/");
  if (booking.contactId) revalidatePath(`/contacts/${booking.contactId}`);
}

export type TokenActionResult = {
  ok: boolean;
  /** État final de la demande, pour l'affichage. */
  etat: "confirme" | "annule" | "introuvable" | "deja_confirme" | "deja_annule";
  quand?: string;
};

/**
 * Traite un clic sur le magic link reçu par email.
 * `action` = "confirmer" | "annuler".
 */
export async function resolveBookingByToken(
  token: string,
  action: "confirmer" | "annuler"
): Promise<TokenActionResult> {
  if (!token) return { ok: false, etat: "introuvable" };

  const booking = await prisma.booking.findUnique({ where: { token } });
  if (!booking) return { ok: false, etat: "introuvable" };

  const quand = formatQuand(booking.debut);

  // Déjà traité : on renvoie l'état courant sans rien changer
  if (booking.statut === "CONFIRME" && action === "confirmer") {
    return { ok: true, etat: "deja_confirme", quand };
  }
  if (booking.statut === "ANNULE") {
    return { ok: true, etat: "deja_annule", quand };
  }

  if (action === "confirmer") {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { statut: "CONFIRME", confirmedAt: new Date() },
    });
    if (booking.evenementId) {
      await prisma.evenement
        .update({
          where: { id: booking.evenementId },
          data: {
            titre: [
              `Rendez-vous — ${`${booking.prenom ?? ""} ${booking.nom}`.trim()}`,
              booking.adresseBien,
            ]
              .filter(Boolean)
              .join(" · "),
            description: [
              "Rendez-vous confirmé par le client.",
              booking.adresseBien ? `Bien concerné : ${booking.adresseBien}` : null,
              booking.message ? `Message : ${booking.message}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        })
        .catch(() => undefined);
    }
  } else {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { statut: "ANNULE", annuleAt: new Date() },
    });
    if (booking.evenementId) {
      await prisma.evenement
        .delete({ where: { id: booking.evenementId } })
        .catch(() => undefined);
    }
  }

  revalidatePath("/calendrier");
  revalidatePath("/rdv");
  revalidatePath("/");
  if (booking.contactId) revalidatePath(`/contacts/${booking.contactId}`);

  return {
    ok: true,
    etat: action === "confirmer" ? "confirme" : "annule",
    quand,
  };
}

export type BookResult =
  | { ok: true; contactCreated: boolean }
  | { ok: false; error: string };

/**
 * Réservation depuis la page publique.
 * Rattache le RDV à la fiche contact si l'email existe, sinon crée la fiche.
 */
export async function bookSlot(input: {
  debutISO: string;
  nom: string;
  prenom?: string;
  email: string;
  telephone?: string;
  adresseBien?: string;
  villeBien?: string;
  codePostalBien?: string;
  message?: string;
}): Promise<BookResult> {
  const email = input.email?.trim().toLowerCase();
  const nom = input.nom?.trim();
  if (!nom) return { ok: false, error: "Le nom est requis." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Adresse email invalide." };
  }

  const debut = new Date(input.debutISO);
  if (Number.isNaN(debut.getTime())) {
    return { ok: false, error: "Créneau invalide." };
  }

  const settings = await getCalendarSettings();
  if (!settings.actif) {
    return { ok: false, error: "Les réservations sont momentanément fermées." };
  }

  // Revalide le créneau côté serveur (anti double-réservation / triche).
  // Les agendas externes sont relus sans cache : entre l'affichage de la page
  // et la validation, un événement a pu être ajouté dans Google Agenda.
  const [rules, closures, busy, busyExterne] = await Promise.all([
    prisma.availabilityRule.findMany(),
    prisma.slotClosure.findMany(),
    prisma.booking.findMany({
      where: {
        statut: { in: [...STATUTS_OCCUPANTS] },
        debut: { gte: new Date() },
      },
      select: { debut: true, fin: true },
    }),
    getBusyFromExternalCalendars(settings.horizonJours, { fresh: true }),
  ]);

  const slots = generateSlots({
    rules,
    closures,
    busy: [...busy, ...busyExterne],
    settings: {
      dureeCreneauMin: settings.dureeCreneauMin,
      preavisHeures: settings.preavisHeures,
      horizonJours: settings.horizonJours,
      pauseMin: settings.pauseMin,
    },
  });

  const target = slots.find((s) => s.debut.getTime() === debut.getTime());
  if (!target) {
    return {
      ok: false,
      error: "Ce créneau n'est plus disponible. Merci d'en choisir un autre.",
    };
  }

  // Rattachement ou création de la fiche contact
  const existing = await prisma.contact.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  let contactId: string;
  let contactCreated = false;
  if (existing) {
    contactId = existing.id;
    // Complète les infos manquantes sans écraser l'existant
    await prisma.contact.update({
      where: { id: existing.id },
      data: {
        telephone: existing.telephone ?? input.telephone?.trim() ?? null,
        prenom: existing.prenom ?? input.prenom?.trim() ?? null,
      },
    });
  } else {
    const created = await prisma.contact.create({
      data: {
        nom,
        prenom: input.prenom?.trim() || null,
        email,
        telephone: input.telephone?.trim() || null,
        roles: [],
        notes: "Fiche créée automatiquement via la prise de RDV en ligne.",
      },
    });
    contactId = created.id;
    contactCreated = true;
  }

  const adresseBien = input.adresseBien?.trim() || null;
  const qui = `${input.prenom ?? ""} ${nom}`.trim();
  // L'adresse du bien devient l'information principale du rendez-vous.
  const titre = adresseBien
    ? `Rendez-vous — ${qui} · ${adresseBien}`
    : `Rendez-vous — ${qui}`;

  const quand = formatQuand(target.debut);

  const evenement = await prisma.evenement.create({
    data: {
      type: "RDV",
      titre: `${titre} (à confirmer)`,
      date: target.debut,
      description: [
        "Demande reçue en ligne, en attente de confirmation du client.",
        adresseBien ? `Bien concerné : ${adresseBien}` : null,
        input.message?.trim() ? `Message : ${input.message.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      contactId,
    },
  });

  const token = randomBytes(24).toString("base64url");

  await prisma.booking.create({
    data: {
      debut: target.debut,
      fin: target.fin,
      statut: "EN_ATTENTE",
      token,
      adresseBien,
      villeBien: input.villeBien?.trim() || null,
      codePostalBien: input.codePostalBien?.trim() || null,
      nom,
      prenom: input.prenom?.trim() || null,
      email,
      telephone: input.telephone?.trim() || null,
      message: input.message?.trim() || null,
      contactId,
      evenementId: evenement.id,
    },
  });

  // Magic link de confirmation (silencieux si Resend n'est pas configuré)
  const base = getPublicUrl();
  const lienConfirme = `${base}/rdv/confirmation?token=${token}&action=confirmer`;
  const lienAnnule = `${base}/rdv/confirmation?token=${token}&action=annuler`;

  await sendEmail({
    to: email,
    subject: `Confirmez votre présence pour le rendez-vous de ${quand}`,
    text: `Bonjour ${input.prenom ?? nom},

J'ai bien reçu votre demande de rendez-vous pour le ${quand}.

Merci de confirmer votre présence :
• Je confirme : ${lienConfirme}
• J'annule : ${lienAnnule}

POUR PRÉPARER NOTRE RENDEZ-VOUS
Merci de réunir si possible les documents suivants :
${piecesTexte()}

Si l'un d'eux vous manque, ce n'est pas bloquant : nous ferons le point
ensemble sur place.

À très bientôt,
Véronique Noureddine / L'Immobilière de Saverne`,
    html: buildConfirmationEmail({
      prenom: input.prenom?.trim() || nom,
      quand,
      adresseBien,
      lienConfirme,
      lienAnnule,
    }),
  });

  revalidatePath("/calendrier");
  revalidatePath("/rdv");
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/");

  return { ok: true, contactCreated };
}
