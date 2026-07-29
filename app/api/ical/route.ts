import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { buildIcs } from "@/lib/ical";

export const dynamic = "force-dynamic";

/**
 * Flux iCal des rendez-vous, destiné à l'abonnement depuis Google Agenda.
 *
 * Accès public par nature (Google le récupère sans pouvoir s'authentifier),
 * mais protégé par un jeton secret dans l'URL — le modèle utilisé par Google
 * Agenda lui-même pour ses « adresses secrètes ». Le jeton est régénérable
 * depuis l'onglet Calendrier, ce qui invalide immédiatement l'ancien lien.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return new NextResponse("Jeton manquant.", { status: 401 });
  }

  const settings = await prisma.calendarSettings.findFirst({
    where: { icsToken: token },
  });

  if (!settings) {
    return new NextResponse("Lien de calendrier invalide ou révoqué.", {
      status: 403,
    });
  }

  // On expose les rendez-vous à venir et un historique court, suffisant pour
  // que l'agenda reste cohérent sans alourdir le flux.
  const depuis = new Date();
  depuis.setDate(depuis.getDate() - 60);

  const bookings = await prisma.booking.findMany({
    where: {
      statut: { in: ["EN_ATTENTE", "CONFIRME"] },
      debut: { gte: depuis },
    },
    orderBy: { debut: "asc" },
  });

  const ics = buildIcs(
    bookings.map((b) => ({
      id: b.id,
      debut: b.debut,
      fin: b.fin,
      statut: b.statut,
      nom: b.nom,
      prenom: b.prenom,
      email: b.email,
      telephone: b.telephone,
      message: b.message,
      adresseBien: b.adresseBien,
      updatedAt: b.createdAt,
    })),
    { nomCalendrier: "Rendez-vous — L'Immobilière de Saverne" }
  );

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="rendez-vous.ics"',
      // Le flux évolue à chaque réservation : pas de mise en cache.
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
