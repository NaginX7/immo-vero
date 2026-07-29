"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { generateSlots, parseHHMM } from "@/lib/slots";
import type { BookingReason } from "@prisma/client";

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

function formatQuand(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(d);
}

/** Email HTML de confirmation avec les deux boutons (magic link). */
function buildConfirmationEmail(p: {
  prenom: string;
  quand: string;
  lienConfirme: string;
  lienAnnule: string;
}): string {
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f7f5f3;font-family:Arial,Helvetica,sans-serif;color:#16233f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f3;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eee3dd;">
        <tr>
          <td style="background:#16233f;padding:20px 28px;color:#ffffff;">
            <div style="font-size:16px;font-weight:bold;">L'Immobilière de Saverne</div>
            <div style="font-size:13px;color:#a7b6d2;">Véronique Noureddine · Mandataire immobilière</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 16px;font-size:15px;">Bonjour ${p.prenom},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
              J'ai bien reçu votre demande de rendez-vous pour&nbsp;:
            </p>
            <p style="margin:0 0 24px;padding:14px 16px;background:#fbf3f0;border-left:3px solid #ee6c4d;border-radius:6px;font-size:15px;font-weight:bold;">
              ${p.quand}
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
              Merci de me confirmer votre présence&nbsp;:
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
              <tr>
                <td style="padding-right:10px;">
                  <a href="${p.lienConfirme}"
                     style="display:inline-block;padding:13px 26px;background:#ee6c4d;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:bold;">
                    Je confirme
                  </a>
                </td>
                <td>
                  <a href="${p.lienAnnule}"
                     style="display:inline-block;padding:13px 26px;background:#ffffff;color:#16233f;text-decoration:none;border:1px solid #d9d2cc;border-radius:8px;font-size:15px;font-weight:bold;">
                    J'annule
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
              Sans confirmation de votre part, le créneau pourra être proposé à
              une autre personne.
            </p>
            <p style="margin:24px 0 0;font-size:15px;">
              À très bientôt,<br />
              <strong>Véronique Noureddine</strong><br />
              L'Immobilière de Saverne
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">L'Immobilière de Saverne · Réseau BSK · Saverne (67700)</p>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Réglages du calendrier, créés à la volée si absents. */
export async function getCalendarSettings() {
  const existing = await prisma.calendarSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  if (existing) return existing;
  return prisma.calendarSettings.create({ data: { id: SETTINGS_ID } });
}

// --- Réglages -------------------------------------------------------------

export async function updateCalendarSettings(fd: FormData) {
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
  await prisma.availabilityRule.update({ where: { id }, data: { actif } });
  revalidatePath("/calendrier");
  revalidatePath("/rdv");
}

export async function deleteAvailabilityRule(id: string) {
  await prisma.availabilityRule.delete({ where: { id } });
  revalidatePath("/calendrier");
  revalidatePath("/rdv");
}

// --- Fermetures ----------------------------------------------------------

export async function addClosure(fd: FormData) {
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
  await prisma.slotClosure.delete({ where: { id } });
  revalidatePath("/calendrier");
  revalidatePath("/rdv");
}

// --- Réservations ---------------------------------------------------------

export async function cancelBooking(id: string) {
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
            titre: `${
              REASON_LABELS[booking.motif] ?? "Rendez-vous"
            } — ${`${booking.prenom ?? ""} ${booking.nom}`.trim()}`,
            description: `Rendez-vous confirmé par le client${
              booking.message ? `. Message : ${booking.message}` : "."
            }`,
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

const REASON_LABELS: Record<BookingReason, string> = {
  ESTIMATION: "Estimation",
  VISITE: "Visite",
  CONSEIL: "Conseil",
  AUTRE: "Rendez-vous",
};

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
  motif?: string;
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

  // Revalide le créneau côté serveur (anti double-réservation / triche)
  const [rules, closures, busy] = await Promise.all([
    prisma.availabilityRule.findMany(),
    prisma.slotClosure.findMany(),
    prisma.booking.findMany({
      where: {
        statut: { in: [...STATUTS_OCCUPANTS] },
        debut: { gte: new Date() },
      },
      select: { debut: true, fin: true },
    }),
  ]);

  const slots = generateSlots({
    rules,
    closures,
    busy,
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

  const motif = (input.motif as BookingReason) || "AUTRE";
  const titre = `${REASON_LABELS[motif] ?? "Rendez-vous"} — ${
    `${input.prenom ?? ""} ${nom}`.trim()
  }`;

  const quand = formatQuand(target.debut);

  const evenement = await prisma.evenement.create({
    data: {
      type: "RDV",
      titre: `${titre} (à confirmer)`,
      date: target.debut,
      description: input.message?.trim()
        ? `Demande reçue en ligne, en attente de confirmation du client. Message : ${input.message.trim()}`
        : "Demande reçue en ligne, en attente de confirmation du client.",
      contactId,
    },
  });

  const token = randomBytes(24).toString("base64url");

  await prisma.booking.create({
    data: {
      debut: target.debut,
      fin: target.fin,
      motif,
      statut: "EN_ATTENTE",
      token,
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
  const base = getBaseUrl();
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

À très bientôt,
Véronique Noureddine / L'Immobilière de Saverne`,
    html: buildConfirmationEmail({
      prenom: input.prenom?.trim() || nom,
      quand,
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
