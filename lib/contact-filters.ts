import type { ContactRole, Prisma } from "@prisma/client";

type SP = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/**
 * Filtres de la liste des contacts, lus depuis les paramètres d'URL.
 * Partagés entre la page et les actions groupées (« tous les résultats »),
 * pour qu'une action porte exactement sur les contacts affichés.
 */
export function contactWhere(searchParams: SP): Prisma.ContactWhereInput {
  const q = one(searchParams.q);
  const role = one(searchParams.role) as ContactRole | undefined;
  const ville = one(searchParams.ville);
  const segment = one(searchParams.segment);

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
  if (segment) where.segments = { some: { id: segment } };
  if (one(searchParams.aBiens)) where.biens = { some: {} };
  if (one(searchParams.aRecherche)) where.recherches = { some: {} };
  return where;
}
