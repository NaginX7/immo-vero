// Envoi des rappels de rendez-vous, 48 h avant.
//
// Module simple (pas de "use server") : appelé par la route planifiée
// /api/cron/rappels, il n'est pas exposé comme action au navigateur.

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { buildRappelEmail, piecesTexte } from "@/lib/emails-rdv";

/**
 * Fenêtre de tir centrée sur 48 h.
 *
 * Large de 24 h pour qu'une exécution quotidienne couvre chaque rendez-vous
 * exactement une fois : ni oubli, ni doublon. Le champ `rappelEnvoyeAt` sert
 * de garde-fou supplémentaire si la tâche s'exécute plus souvent.
 */
const HEURES_MIN = 36;
const HEURES_MAX = 60;

export type ResultatRappels = {
  envoyes: number;
  echecs: number;
  details: string[];
};

function formatQuand(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(d);
}

/** Envoie les rappels dus. Idempotent : un rendez-vous n'est rappelé qu'une fois. */
export async function envoyerRappels(baseUrl: string): Promise<ResultatRappels> {
  const maintenant = Date.now();
  const debutFenetre = new Date(maintenant + HEURES_MIN * 3600_000);
  const finFenetre = new Date(maintenant + HEURES_MAX * 3600_000);

  const bookings = await prisma.booking.findMany({
    where: {
      // Uniquement les rendez-vous que le client a confirmés.
      statut: "CONFIRME",
      rappelEnvoyeAt: null,
      debut: { gte: debutFenetre, lte: finFenetre },
    },
    orderBy: { debut: "asc" },
  });

  const details: string[] = [];
  let envoyes = 0;
  let echecs = 0;

  for (const b of bookings) {
    const prenom = b.prenom?.trim() || b.nom;
    const quand = formatQuand(b.debut);
    const lienAnnule = b.token
      ? `${baseUrl}/rdv/confirmation?token=${b.token}&action=annuler`
      : `${baseUrl}/rdv`;

    const res = await sendEmail({
      to: b.email,
      subject: `Rappel — notre rendez-vous ${quand}`,
      text: `Bonjour ${prenom},

Je vous confirme notre rendez-vous dans deux jours :
${quand}${b.adresseBien ? `\n${b.adresseBien}` : ""}

POUR PRÉPARER NOTRE RENDEZ-VOUS
Merci de réunir si possible les documents suivants :
${piecesTexte()}

Si l'un d'eux vous manque, ce n'est pas bloquant : nous ferons le point
ensemble sur place.

Un empêchement ? Vous pouvez annuler ici : ${lienAnnule}
ou simplement répondre à cet email.

À très bientôt,
Véronique Noureddine / L'Immobilière de Saverne`,
      html: buildRappelEmail({
        prenom,
        quand,
        adresseBien: b.adresseBien,
        lienAnnule,
      }),
    });

    if (res.ok) {
      // Marqué seulement en cas de succès : un échec sera retenté au passage
      // suivant, tant que le rendez-vous reste dans la fenêtre.
      await prisma.booking.update({
        where: { id: b.id },
        data: { rappelEnvoyeAt: new Date() },
      });
      envoyes++;
      details.push(`OK ${b.email} — ${quand}`);
    } else {
      echecs++;
      details.push(`ÉCHEC ${b.email} — ${res.error}`);
    }
  }

  return { envoyes, echecs, details };
}
