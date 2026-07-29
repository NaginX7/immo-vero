import Link from "next/link";
import {
  Home,
  FileWarning,
  CalendarClock,
  FileSignature,
  ShieldAlert,
  ArrowRight,
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  PIPELINE_ORDER,
  STAGE_LABELS,
  EVENT_TYPE_LABELS,
} from "@/lib/labels";
import { docStats, isTracfinOk } from "@/lib/domain";
import { formatDateShort, formatDateTime, cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ExchangeType } from "@prisma/client";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

const exchangeIcon: Record<ExchangeType, typeof Mail> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  APPEL: Phone,
  NOTE: StickyNote,
};

export default async function DashboardPage() {
  await requireAuth();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [biens, upcoming, activities] = await Promise.all([
    prisma.bien.findMany({
      where: { archive: false },
      include: { documents: true, proprietaires: true },
    }),
    prisma.evenement.findMany({
      where: { date: { gte: startOfToday } },
      orderBy: { date: "asc" },
      take: 6,
      include: { bien: true, contact: true },
    }),
    prisma.echange.findMany({
      orderBy: { date: "desc" },
      take: 6,
      include: { contact: true, bien: true },
    }),
  ]);

  const actifs = biens.filter((b) => b.stage !== "VENTE_DEFINITIVE");
  const mandats = biens.filter((b) =>
    [
      "MANDAT_SIGNE",
      "COMMERCIALISATION",
      "VISITE_PLANIFIEE",
      "OFFRE_EN_COURS",
      "COMPROMIS",
    ].includes(b.stage)
  );

  const countByStage = Object.fromEntries(
    PIPELINE_ORDER.map((s) => [s, biens.filter((b) => b.stage === s).length])
  ) as Record<string, number>;

  const biensAvecManquants = biens
    .map((b) => ({
      bien: b,
      stats: docStats(b.documents),
      tracfin: isTracfinOk(b.documents),
    }))
    .filter((x) => x.stats.manquants > 0)
    .sort((a, b) => b.stats.manquants - a.stats.manquants);

  const totalManquants = biensAvecManquants.reduce(
    (acc, x) => acc + x.stats.manquants,
    0
  );

  const stats = [
    {
      label: "Biens actifs",
      value: actifs.length,
      icon: Home,
      href: "/biens",
      tone: "text-navy-700 bg-navy-50",
    },
    {
      label: "Mandats en cours",
      value: mandats.length,
      icon: FileSignature,
      href: "/pipeline",
      tone: "text-coral-600 bg-powder-50",
    },
    {
      label: "RDV à venir",
      value: upcoming.length,
      icon: CalendarClock,
      href: "/pipeline",
      tone: "text-sky-700 bg-sky-50",
    },
    {
      label: "Documents manquants",
      value: totalManquants,
      icon: FileWarning,
      href: "/biens",
      tone: "text-amber-700 bg-amber-50",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de votre activité"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-lg",
                      s.tone
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-navy-800">
                      {s.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Pipeline overview */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Biens par étape</CardTitle>
          <Link
            href="/pipeline"
            className="inline-flex items-center gap-1 text-sm font-medium text-coral-600 hover:underline"
          >
            Voir le pipeline <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PIPELINE_ORDER.map((stage) => (
              <Link
                key={stage}
                href="/pipeline"
                className="rounded-lg border border-border p-3 transition-colors hover:bg-muted"
              >
                <p className="text-2xl font-bold text-navy-800">
                  {countByStage[stage] ?? 0}
                </p>
                <p className="mt-1 text-xs leading-tight text-muted-foreground">
                  {STAGE_LABELS[stage]}
                </p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Prochains RDV */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-coral-500" />
              Prochains rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucun rendez-vous à venir.
              </p>
            )}
            {upcoming.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex flex-col items-center rounded-md bg-navy-50 px-2.5 py-1 text-navy-700">
                  <span className="text-[10px] uppercase">
                    {new Intl.DateTimeFormat("fr-FR", {
                      month: "short",
                    }).format(ev.date)}
                  </span>
                  <span className="text-lg font-bold leading-none">
                    {ev.date.getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="muted">{EVENT_TYPE_LABELS[ev.type]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(ev.date).split(" ")[1]}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{ev.titre}</p>
                  {ev.bien && (
                    <Link
                      href={`/biens/${ev.bien.id}`}
                      className="text-xs text-muted-foreground hover:text-coral-600"
                    >
                      {ev.bien.titre}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alertes documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Alertes documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {biensAvecManquants.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Tous les dossiers sont complets. 🎉
              </p>
            )}
            {biensAvecManquants.slice(0, 5).map(({ bien, stats, tracfin }) => (
              <Link
                key={bien.id}
                href={`/biens/${bien.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{bien.titre}</p>
                  <p className="text-xs text-muted-foreground">
                    {bien.ville ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!tracfin && (
                    <Badge variant="danger" className="gap-1">
                      <ShieldAlert className="h-3 w-3" /> TRACFIN
                    </Badge>
                  )}
                  <Badge variant="warning">{stats.manquants} manquant(s)</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Dernières activités */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Dernières activités</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activities.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucune activité récente.
            </p>
          )}
          {activities.map((ex) => {
            const Icon = exchangeIcon[ex.type];
            return (
              <div
                key={ex.id}
                className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{ex.contenu}</p>
                  <p className="text-xs text-muted-foreground">
                    {ex.contact
                      ? `${ex.contact.prenom ?? ""} ${ex.contact.nom}`.trim()
                      : "—"}
                    {" · "}
                    {formatDateShort(ex.date)}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
