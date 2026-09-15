"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { supprimerBlobs } from "@/lib/blob";
import { contactWhere } from "@/lib/contact-filters";
import { PARTENAIRE_TYPE_LABELS } from "@/lib/labels";

/**
 * Contacts visés par une action groupée : une liste d'identifiants (sélection
 * sur la page), ou tous les contacts correspondant aux filtres de la liste.
 */
export type SelectionContacts =
  | { ids: string[] }
  | { filtres: Record<string, string> };

async function resoudreSelection(selection: SelectionContacts): Promise<string[]> {
  if ("ids" in selection) return Array.from(new Set(selection.ids.filter(Boolean)));
  const rows = await prisma.contact.findMany({
    where: contactWhere(selection.filtres),
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

function revalidateContacts() {
  revalidatePath("/contacts");
  revalidatePath("/partenaires");
  revalidatePath("/");
}

// --- Segments --------------------------------------------------------------

/** Ajoute des contacts à un segment existant, ou à un nouveau segment créé à la volée. */
export async function ajouterAuSegment(
  selection: SelectionContacts,
  segment: { id: string } | { nom: string }
): Promise<{ ok: true; segmentId: string; ajoutes: number } | { ok: false; error: string }> {
  await requireAuth();
  const ids = await resoudreSelection(selection);
  if (ids.length === 0) return { ok: false, error: "Aucun contact sélectionné." };

  let segmentId: string;
  if ("id" in segment) {
    segmentId = segment.id;
  } else {
    const nom = segment.nom.trim();
    if (!nom) return { ok: false, error: "Donnez un nom au segment." };
    const s = await prisma.segment.upsert({ where: { nom }, update: {}, create: { nom } });
    segmentId = s.id;
  }

  await prisma.segment.update({
    where: { id: segmentId },
    data: { contacts: { connect: ids.map((id) => ({ id })) } },
  });
  revalidateContacts();
  return { ok: true, segmentId, ajoutes: ids.length };
}

export async function retirerDuSegment(contactId: string, segmentId: string) {
  await requireAuth();
  await prisma.segment.update({
    where: { id: segmentId },
    data: { contacts: { disconnect: { id: contactId } } },
  });
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
}

/** Supprime un segment ; les contacts qu'il regroupait sont conservés. */
export async function supprimerSegment(segmentId: string) {
  await requireAuth();
  await prisma.segment.delete({ where: { id: segmentId } });
  revalidatePath("/contacts");
  redirect("/contacts");
}

// --- Suppression -----------------------------------------------------------

export async function supprimerContacts(
  selection: SelectionContacts
): Promise<{ ok: true; supprimes: number }> {
  await requireAuth();
  const ids = await resoudreSelection(selection);
  if (ids.length === 0) return { ok: true, supprimes: 0 };

  const fichiers = await prisma.documentFichier.findMany({
    where: { document: { contactId: { in: ids } } },
    select: { url: true },
  });
  const { count } = await prisma.contact.deleteMany({ where: { id: { in: ids } } });
  await supprimerBlobs(fichiers.map((f) => f.url));
  revalidateContacts();
  revalidatePath("/biens");
  return { ok: true, supprimes: count };
}

// --- Conversion contact ⇄ partenaire ---------------------------------------

export type ConversionIgnoree = { id: string; nom: string; raisons: string[] };

async function convertir(ids: string[]) {
  const contacts = await prisma.contact.findMany({
    where: { id: { in: ids } },
    include: {
      _count: {
        select: {
          biens: true,
          apporteurPour: true,
          recherches: true,
          documents: true,
          bookings: true,
        },
      },
    },
  });

  const ignores: ConversionIgnoree[] = [];
  const partenaireIds: string[] = [];

  for (const c of contacts) {
    const nom = `${c.prenom ?? ""} ${c.nom}`.trim() || c.nom;
    const n = c._count;
    const raisons = [
      n.biens && `propriétaire de ${n.biens} bien(s)`,
      n.apporteurPour && `apporteur de ${n.apporteurPour} bien(s)`,
      n.recherches && `${n.recherches} recherche(s)`,
      n.documents && `${n.documents} pièce(s) justificative(s)`,
      n.bookings && `${n.bookings} rendez-vous`,
    ].filter((r): r is string => !!r);
    if (raisons.length > 0) {
      ignores.push({ id: c.id, nom, raisons });
      continue;
    }

    const adresse = [c.adresse, [c.codePostal, c.ville].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");

    const partenaireId = await prisma.$transaction(async (tx) => {
      const p = await tx.partenaire.create({
        data: {
          nom,
          type: "AUTRE",
          specialite: c.profession,
          telephone: c.telephone,
          email: c.email,
          adresse: adresse || null,
          notes: c.notes,
        },
      });
      await tx.echange.updateMany({
        where: { contactId: c.id },
        data: { contactId: null, partenaireId: p.id },
      });
      // Un événement déjà rattaché à un autre partenaire garde ce lien.
      await tx.evenement.updateMany({
        where: { contactId: c.id, partenaireId: null },
        data: { contactId: null, partenaireId: p.id },
      });
      await tx.contact.delete({ where: { id: c.id } });
      return p.id;
    });
    partenaireIds.push(partenaireId);
  }

  revalidateContacts();
  return { partenaireIds, ignores };
}

/**
 * Convertit des contacts en partenaires (type « Autre »), en reprenant leurs
 * coordonnées, leurs échanges et leurs événements.
 *
 * Un partenaire ne peut être propriétaire ou apporteur d'un bien, ni avoir de
 * recherche, de pièces justificatives ou de rendez-vous : les contacts qui ont
 * de tels liens ne sont pas convertis, pour ne rien perdre.
 */
export async function convertirContactsEnPartenaires(
  selection: SelectionContacts
): Promise<{ ok: true; convertis: number; ignores: ConversionIgnoree[] }> {
  await requireAuth();
  const { partenaireIds, ignores } = await convertir(await resoudreSelection(selection));
  return { ok: true, convertis: partenaireIds.length, ignores };
}

/** Convertit un contact depuis sa fiche, puis ouvre la fiche partenaire créée. */
export async function convertirContactEnPartenaire(
  contactId: string
): Promise<{ ok: false; raisons: string[] } | void> {
  await requireAuth();
  const { partenaireIds, ignores } = await convertir([contactId]);
  if (ignores.length > 0) return { ok: false, raisons: ignores[0].raisons };
  redirect(partenaireIds[0] ? `/partenaires/${partenaireIds[0]}` : "/partenaires");
}

/**
 * Convertit un partenaire en contact, avec ses échanges et ses événements.
 * Le type, la spécialité et la société sont repris dans la profession ; le
 * compteur d'affaires, sans équivalent côté contact, est noté dans les notes.
 */
export async function convertirPartenaireEnContact(partenaireId: string) {
  await requireAuth();
  const p = await prisma.partenaire.findUniqueOrThrow({ where: { id: partenaireId } });

  const profession = [
    p.type !== "AUTRE" ? PARTENAIRE_TYPE_LABELS[p.type] : null,
    p.specialite,
    p.societe,
  ]
    .filter(Boolean)
    .join(" · ");
  const notes = [
    p.notes,
    p.nbAffaires > 0 ? `Ancien partenaire : ${p.nbAffaires} affaire(s) traitée(s) ensemble.` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const contact = await prisma.$transaction(async (tx) => {
    const c = await tx.contact.create({
      data: {
        nom: p.nom,
        telephone: p.telephone,
        email: p.email,
        adresse: p.adresse,
        profession: profession || null,
        notes: notes || null,
        roles: [],
      },
    });
    await tx.echange.updateMany({
      where: { partenaireId: p.id },
      data: { partenaireId: null, contactId: c.id },
    });
    // Un événement déjà rattaché à un autre contact garde ce lien.
    await tx.evenement.updateMany({
      where: { partenaireId: p.id, contactId: null },
      data: { partenaireId: null, contactId: c.id },
    });
    await tx.partenaire.delete({ where: { id: p.id } });
    return c;
  });

  revalidateContacts();
  redirect(`/contacts/${contact.id}`);
}
