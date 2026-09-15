import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { contactWhere } from "@/lib/contact-filters";
import { PageHeader } from "@/components/layout/page-header";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import { ContactsFilters } from "@/components/contacts/contacts-filters";
import { ContactsList } from "@/components/contacts/contacts-list";
import { Pagination } from "@/components/pagination";
import { requireAuth } from "@/lib/auth-guard";
import { supprimerSegment } from "@/lib/contact-actions";
import { DeleteButton } from "@/components/delete-button";

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
  const where = contactWhere(searchParams);

  const sort = one(searchParams.sort);
  const orderBy: Prisma.ContactOrderByWithRelationInput[] =
    sort === "ancien"
      ? [{ createdAt: "asc" }]
      : sort === "nom_asc"
      ? [{ nom: "asc" }, { prenom: "asc" }]
      : sort === "nom_desc"
      ? [{ nom: "desc" }, { prenom: "desc" }]
      : [{ createdAt: "desc" }];

  const [totalCount, villeRows, segments] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where: { ville: { not: null } },
      select: { ville: true },
      distinct: ["ville"],
      orderBy: { ville: "asc" },
    }),
    prisma.segment.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, _count: { select: { contacts: true } } },
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
      segments: { select: { nom: true }, orderBy: { nom: "asc" } },
    },
  });

  // Filtres actifs, transmis tels quels aux actions « tous les résultats »
  const filtres: Record<string, string> = {};
  for (const [k, v] of Object.entries(searchParams)) {
    const val = one(v);
    if (val && k !== "page" && k !== "sort") filtres[k] = val;
  }
  const segmentActif = segments.find((s) => s.id === filtres.segment);

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

      <ContactsFilters
        villes={villes}
        segments={segments.map((s) => ({
          id: s.id,
          nom: `${s.nom} (${s._count.contacts})`,
        }))}
      />

      {segmentActif && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Segment :</span>
          <span className="font-medium">{segmentActif.nom}</span>
          <DeleteButton
            action={supprimerSegment.bind(null, segmentActif.id)}
            label="Supprimer le segment"
            confirmMessage={`Supprimer le segment « ${segmentActif.nom} » ? Les contacts sont conservés.`}
          />
        </div>
      )}

      <ContactsList
          contacts={contacts.map((c) => ({
            id: c.id,
            civilite: c.civilite,
            nom: c.nom,
            prenom: c.prenom,
            roles: c.roles,
            profession: c.profession,
            telephone: c.telephone,
            email: c.email,
            ville: c.ville,
            nbBiens: c._count.biens,
            nbRecherches: c._count.recherches,
            segments: c.segments.map((s) => s.nom),
          }))}
          totalCount={totalCount}
          filtres={filtres}
          segments={segments.map((s) => ({ id: s.id, nom: s.nom }))}
        />

      <Pagination
        basePath="/contacts"
        searchParams={searchParams}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
