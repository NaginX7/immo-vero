import Link from "next/link";
import {
  CalendarClock,
  Link2,
  Settings2,
  UserPlus,
  CalendarSync,
  MapPin,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  getCalendarSettings,
  cancelBooking,
  getIcsUrl,
} from "@/lib/calendar-actions";
import { generateSlots } from "@/lib/slots";

import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { AvailabilityEditor } from "@/components/calendrier/availability-editor";
import { ClosuresEditor } from "@/components/calendrier/closures-editor";
import { SettingsForm } from "@/components/calendrier/settings-form";
import { SyncGoogle } from "@/components/calendrier/sync-google";
import { PublicLink } from "@/components/calendrier/public-link";
import { DeleteButton } from "@/components/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";


export default async function CalendrierPage() {
  await requireAuth();
  const settings = await getCalendarSettings();
  const [rules, closures, bookings] = await Promise.all([
    prisma.availabilityRule.findMany({
      orderBy: [{ jourSemaine: "asc" }, { heureDebut: "asc" }],
    }),
    prisma.slotClosure.findMany({
      where: { fin: { gte: new Date() } },
      orderBy: { debut: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        statut: { in: ["EN_ATTENTE", "CONFIRME"] },
        debut: { gte: new Date() },
      },
      orderBy: { debut: "asc" },
      include: { contact: true },
    }),
  ]);

  const [icsUrl, agendasExternes] = await Promise.all([
    getIcsUrl(),
    prisma.externalCalendar.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const busy = bookings.map((b) => ({ debut: b.debut, fin: b.fin }));
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

  return (
    <div>
      <PageHeader
        title="Calendrier"
        subtitle="Vos disponibilités et les rendez-vous pris en ligne"
      />

      {/* Lien public */}
      <Card className="mb-6 border-powder-200 bg-powder-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-coral-500" />
            Votre lien de prise de rendez-vous
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <PublicLink
            baseUrl={process.env.PUBLIC_URL?.trim().replace(/\/+$/, "") || null}
          />
          <p className="text-xs text-muted-foreground">
            Partagez ce lien : vos clients choisissent un créneau libre et le
            rendez-vous arrive directement dans le CRM.{" "}
            {settings.actif ? (
              <span className="font-medium text-emerald-700">
                Réservations ouvertes · {slots.length} créneau(x) disponible(s).
              </span>
            ) : (
              <span className="font-medium text-destructive">
                Réservations suspendues.
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Disponibilités */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Disponibilités hebdomadaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AvailabilityEditor rules={rules} />
            </CardContent>
          </Card>

          {/* Fermetures */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Fermetures exceptionnelles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ClosuresEditor closures={closures} />
            </CardContent>
          </Card>

          {/* Réservations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4 text-coral-500" />
                Rendez-vous à venir
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bookings.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun rendez-vous réservé pour l&apos;instant.
                </p>
              )}
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {b.statut === "EN_ATTENTE" ? (
                        <Badge variant="warning">En attente</Badge>
                      ) : (
                        <Badge variant="success">Confirmé</Badge>
                      )}
                      <span className="text-sm font-medium">
                        {formatDateTime(b.debut)}
                      </span>
                    </div>
                    {b.adresseBien && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-navy-800">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-coral-500" />
                        {b.adresseBien}
                      </p>
                    )}
                    <p className="mt-1 text-sm">
                      {`${b.prenom ?? ""} ${b.nom}`.trim()}
                      <span className="text-muted-foreground">
                        {" "}
                        · {b.email}
                        {b.telephone ? ` · ${b.telephone}` : ""}
                      </span>
                    </p>
                    {b.message && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        « {b.message} »
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {b.contact && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/contacts/${b.contact.id}`}>
                          Voir la fiche
                        </Link>
                      </Button>
                    )}
                    <DeleteButton
                      action={cancelBooking.bind(null, b.id)}
                      label="Annuler"
                      confirmMessage="Annuler ce rendez-vous ? Le créneau redeviendra disponible."
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Synchronisation Google Agenda */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarSync className="h-4 w-4 text-coral-500" />
                Synchronisation avec Google Agenda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SyncGoogle icsUrl={icsUrl} agendas={agendasExternes} />
            </CardContent>
          </Card>
        </div>

        {/* Réglages */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4 text-navy-500" /> Réglages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsForm settings={settings} />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
              <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" />
              <p>
                À chaque réservation, le rendez-vous est ajouté à la fiche du
                contact si son email est déjà connu — sinon une nouvelle fiche
                est créée automatiquement.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
