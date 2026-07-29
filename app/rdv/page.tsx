import Image from "next/image";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import {
  getCalendarSettings,
  getBusyFromExternalCalendars,
} from "@/lib/calendar-actions";
import { generateSlots } from "@/lib/slots";
import { BookingForm, type PublicSlot } from "@/components/rdv/booking-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prendre rendez-vous — L'Immobilière de Saverne",
  description:
    "Réservez un créneau avec Véronique Noureddine, mandataire immobilière à Saverne.",
};

export default async function RdvPublicPage() {
  const settings = await getCalendarSettings();

  const [rules, closures, bookings, busyExterne] = await Promise.all([
    prisma.availabilityRule.findMany(),
    prisma.slotClosure.findMany({ where: { fin: { gte: new Date() } } }),
    prisma.booking.findMany({
      where: {
        statut: { in: ["EN_ATTENTE", "CONFIRME"] },
        debut: { gte: new Date() },
      },
      select: { debut: true, fin: true },
    }),
    // Occupations issues des agendas externes (Google Agenda…)
    getBusyFromExternalCalendars(settings.horizonJours),
  ]);

  const slots: PublicSlot[] = settings.actif
    ? generateSlots({
        rules,
        closures,
        busy: [...bookings, ...busyExterne],
        settings: {
          dureeCreneauMin: settings.dureeCreneauMin,
          preavisHeures: settings.preavisHeures,
          horizonJours: settings.horizonJours,
          pauseMin: settings.pauseMin,
        },
      }).map((s) => ({
        debut: s.debut.toISOString(),
        fin: s.fin.toISOString(),
      }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* En-tête marque */}
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
          <div className="h-[168px] w-[168px] shrink-0 overflow-hidden rounded-full shadow-md ring-4 ring-powder-100">
            <Image
              src="/veronique.jpg"
              alt="Véronique Noureddine, mandataire immobilière"
              width={336}
              height={336}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <h1 className="whitespace-pre-line font-serif text-3xl font-bold leading-tight tracking-tight text-navy-800">
              {settings.titrePublic}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {settings.messagePublic ??
                "Choisissez le créneau qui vous convient, je vous confirme le rendez-vous par email."}
            </p>
          </div>
        </div>

        {!settings.actif && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Les réservations en ligne sont momentanément suspendues. Merci de me
            contacter directement.
          </div>
        )}

        <div className="mt-8">
          <BookingForm slots={slots} dureeMin={settings.dureeCreneauMin} />
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          L&apos;Immobilière de Saverne · Réseau BSK · Saverne (67700)
        </p>
      </div>
    </div>
  );
}
