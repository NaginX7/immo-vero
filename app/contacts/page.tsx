import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import type { ContactRole, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { RoleBadge } from "@/components/badges";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import { ContactsFilters } from "@/components/contacts/contacts-filters";
import { Pagination } from "@/components/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const num = (v: string | string[] | undefined) => {
  const s = one(v);
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? undefined : n;
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  await requireAuth();
  const q = one(searchParams.q);
  const role = one(searchParams.role) as ContactRole | undefined;
  const ville = one(searchParams.ville);
  const aBiens = one(searchParams.aBiens);
  const aRecherche = one(searchParams.aRecherche);

  const where: Prisma.ContactWhereInput = {};
  if (q) {
    where.OR = [
      { nom: { contains: q, mode: "insensitive" } },
      { prenom: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { telephone: { contains: q, mode: "insensitive" } },
      { ville: { contains: q, mode: "insensitive" } },
      { profession: { contains: q, mode: "insensitive" } },
    ];
  }
  if (role) where.roles = { has: role };
  if (ville) where.ville = ville;
  if (aBiens) where.biens = { some: {} };
  if (aRecherche) where.recherches = { some: {} };

  const sort = one(searchParams.sort);
  const orderBy: Prisma.ContactOrderByWithRelationInput[] =
    sort === "ancien"
      ? [{ createdAt: "asc" }]
      : sort === "nom_asc"
      ? [{ nom: "asc" }, { prenom: "asc" }]
      : sort === "nom_desc"
      ? [{ nom: "desc" }, { prenom: "desc" }]
      : [{ createdAt: "desc" }];

  const [totalCount, villeRows] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where: { ville: { not: null } },
      select: { ville: true },
      distinct: ["ville"],
      orderBy: { ville: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(Math.max(1, num(searchParams.page) ?? 1), totalPages);

  const contacts = await prisma.contact.findMany({
    where,
    orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      _count: { select: { biens: true, recherches: true, echanges: true } },
    },
  });

  const villes = villeRows
    .map((v) => v.ville)
    .filter((v): v is string => !!v);

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${totalCount} contact${
          totalCount > 1 ? "s" : ""
        } affiché${totalCount > 1 ? "s" : ""}`}
      >
        <ContactFormDialog />
      </PageHeader>

      <ContactsFilters villes={villes} />

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Aucun contact ne correspond à votre recherche.
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {contacts.map((c) => {
            const fullName = `${c.prenom ?? ""} ${c.nom}`.trim();
            return (
              <Link
                key={c.id}
                href={`/contacts/${c.id}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-100 text-sm font-semibold text-navy-700">
                  {initials(fullName)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-navy-800">
                      {c.civilite ? `${c.civilite} ` : ""}
                      {fullName}
                    </p>
                    <div className="hidden gap-1 sm:flex">
                      {c.roles.map((r) => (
                        <RoleBadge key={r} role={r} />
                      ))}
                    </div>
                  </div>
                  {c.profession && (
                    <p className="truncate text-xs text-muted-foreground">
                      {c.profession}
                    </p>
                  )}
                </div>

                <div className="hidden shrink-0 items-center gap-6 text-sm text-muted-foreground md:flex">
                  {c.telephone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> {c.telephone}
                    </span>
                  )}
                  {c.email && (
                    <span className="flex w-52 items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </span>
                  )}
                  {c.ville && (
                    <span className="flex w-32 items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {c.ville}
                    </span>
                  )}
                </div>

                <div className="hidden shrink-0 text-right text-xs text-muted-foreground xl:block">
                  {c._count.biens} bien(s) · {c._count.recherches} rech.
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination
        basePath="/contacts"
        searchParams={searchParams}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
