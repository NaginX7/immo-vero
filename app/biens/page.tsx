import Link from "next/link";
import {
  MapPin,
  Ruler,
  BedDouble,
  DoorOpen,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { Prisma, EstimationReason, PipelineStage } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { PIPELINE_ORDER } from "@/lib/labels";
import { docStats, isTracfinOk } from "@/lib/domain";
import { formatEuro, cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StageBadge } from "@/components/badges";
import { BienFormDialog } from "@/components/biens/bien-form-dialog";
import { BiensFilters } from "@/components/biens/biens-filters";
import { Pagination } from "@/components/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 10;

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const num = (v: string | string[] | undefined) => {
  const s = one(v);
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? undefined : n;
};

export default async function BiensPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const q = one(searchParams.q);
  const stage = one(searchParams.stage) as PipelineStage | undefined;
  const ville = one(searchParams.ville);
  const raison = one(searchParams.raison) as EstimationReason | undefined;
  const copro = one(searchParams.copro);
  const tracfinFilter = one(searchParams.tracfin);
  const prixMin = num(searchParams.prixMin);
  const prixMax = num(searchParams.prixMax);
  const surfaceMin = num(searchParams.surfaceMin);
  const surfaceMax = num(searchParams.surfaceMax);
  const chambresMin = num(searchParams.chambresMin);

  const where: Prisma.BienWhereInput = {};
  if (q) {
    where.OR = [
      { titre: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
      { adresse: { contains: q, mode: "insensitive" } },
      { ville: { contains: q, mode: "insensitive" } },
    ];
  }
  if (stage) where.stage = stage;
  if (ville) where.ville = ville;
  if (raison) where.raisonEstimation = raison;
  if (copro === "oui") where.copropriete = true;
  if (copro === "non") where.copropriete = false;
  if (surfaceMin != null || surfaceMax != null) {
    where.surface = {
      ...(surfaceMin != null ? { gte: surfaceMin } : {}),
      ...(surfaceMax != null ? { lte: surfaceMax } : {}),
    };
  }
  if (chambresMin != null) where.nbChambres = { gte: chambresMin };

  const [biensRaw, villeRows] = await Promise.all([
    prisma.bien.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { documents: true, proprietaires: true },
    }),
    prisma.bien.findMany({
      where: { ville: { not: null } },
      select: { ville: true },
      distinct: ["ville"],
      orderBy: { ville: "asc" },
    }),
  ]);

  const villes = villeRows
    .map((v) => v.ville)
    .filter((v): v is string => !!v);

  // Filtres calculés en JS (prix effectif + TRACFIN)
  let biens = biensRaw.map((b) => ({
    bien: b,
    stats: docStats(b.documents),
    tracfin: isTracfinOk(b.documents),
    prix: b.prixMandat ?? b.prixEstime,
  }));
  if (prixMin != null)
    biens = biens.filter((x) => x.prix != null && x.prix >= prixMin);
  if (prixMax != null)
    biens = biens.filter((x) => x.prix != null && x.prix <= prixMax);
  if (tracfinFilter === "conforme") biens = biens.filter((x) => x.tracfin);
  if (tracfinFilter === "incomplet") biens = biens.filter((x) => !x.tracfin);

  const total = biens.length;

  // Tri
  const sort = one(searchParams.sort);
  const nOr = (v: number | null | undefined, fb: number) =>
    v == null ? fb : v;
  switch (sort) {
    case "prix_desc":
      biens.sort((a, b) => nOr(b.prix, -Infinity) - nOr(a.prix, -Infinity));
      break;
    case "prix_asc":
      biens.sort((a, b) => nOr(a.prix, Infinity) - nOr(b.prix, Infinity));
      break;
    case "surface_desc":
      biens.sort(
        (a, b) =>
          nOr(b.bien.surface, -Infinity) - nOr(a.bien.surface, -Infinity)
      );
      break;
    case "surface_asc":
      biens.sort(
        (a, b) => nOr(a.bien.surface, Infinity) - nOr(b.bien.surface, Infinity)
      );
      break;
    case "stage":
      biens.sort(
        (a, b) =>
          PIPELINE_ORDER.indexOf(a.bien.stage) -
          PIPELINE_ORDER.indexOf(b.bien.stage)
      );
      break;
    case "decouverte":
      biens.sort(
        (a, b) =>
          nOr(b.bien.dateDecouverte?.getTime(), -Infinity) -
          nOr(a.bien.dateDecouverte?.getTime(), -Infinity)
      );
      break;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, num(searchParams.page) ?? 1), totalPages);
  const pageItems = biens.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Biens"
        subtitle={`${total} bien${total > 1 ? "s" : ""} affiché${
          total > 1 ? "s" : ""
        }`}
      >
        <BienFormDialog />
      </PageHeader>

      <BiensFilters villes={villes} />

      {biens.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Aucun bien ne correspond à votre recherche.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pageItems.map(({ bien, stats, tracfin, prix }) => (
            <Link key={bien.id} href={`/biens/${bien.id}`} className="block">
              <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  {/* Identité + localisation */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StageBadge stage={bien.stage} />
                      {bien.reference && (
                        <span className="text-xs text-muted-foreground">
                          {bien.reference}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold leading-tight text-navy-800">
                      {bien.titre}
                    </h3>
                    {(bien.adresse || bien.ville) && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        {[bien.adresse, bien.codePostal, bien.ville]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    {bien.proprietaires.length > 0 && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        {bien.proprietaires
                          .map((p) => `${p.prenom ?? ""} ${p.nom}`.trim())
                          .join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Caractéristiques */}
                  <div className="flex shrink-0 items-center gap-6 text-sm">
                    <div className="flex flex-col items-center">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <span className="mt-1 font-medium">
                        {bien.surface ? `${bien.surface} m²` : "—"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <DoorOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="mt-1 font-medium">
                        {bien.nbPieces ?? "—"} p.
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <BedDouble className="h-4 w-4 text-muted-foreground" />
                      <span className="mt-1 font-medium">
                        {bien.nbChambres ?? "—"} ch.
                      </span>
                    </div>
                  </div>

                  {/* Prix */}
                  <div className="shrink-0 lg:w-40 lg:text-right">
                    <p className="text-xl font-bold text-coral-600">
                      {formatEuro(prix)}
                    </p>
                    {bien.prixMandat && bien.prixEstime && (
                      <p className="text-xs text-muted-foreground">
                        Estimé {formatEuro(bien.prixEstime)}
                      </p>
                    )}
                  </div>

                  {/* Docs / TRACFIN */}
                  <div className="shrink-0 lg:w-52">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            stats.complet ? "bg-emerald-500" : "bg-coral-400"
                          )}
                          style={{ width: `${stats.pct}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {stats.recus}/{stats.total} docs
                      </span>
                    </div>
                    <div className="mt-2">
                      {tracfin ? (
                        <Badge variant="success">Dossier conforme</Badge>
                      ) : (
                        <Badge variant="danger" className="gap-1">
                          <ShieldAlert className="h-3 w-3" /> TRACFIN incomplet
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination
        basePath="/biens"
        searchParams={searchParams}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
