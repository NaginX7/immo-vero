"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { BIEN_DOC_CHECKLIST, COPRO_DOC_CHECKLIST, DOC_TYPE_LABELS } from "@/lib/labels";
import type {
  ContactRole,
  DocStatus,
  DocType,
  EstimationReason,
  EventType,
  ExchangeType,
  PartenaireType,
  PipelineStage,
} from "@prisma/client";

// --- Parsers -------------------------------------------------------------

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}
function reqStr(fd: FormData, key: string): string {
  return str(fd, key) ?? "";
}
function int(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = parseInt(v.replace(/\s/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}
function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === "on" || fd.get(key) === "true";
}
function boolOrNull(fd: FormData, key: string): boolean | null {
  const v = str(fd, key);
  if (v === null || v === "") return null;
  return v === "true" || v === "oui" || v === "on";
}
function date(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// --- Biens ---------------------------------------------------------------

export async function createBien(fd: FormData) {
  const copropriete = bool(fd, "copropriete");
  const bien = await prisma.bien.create({
    data: {
      titre: reqStr(fd, "titre") || "Nouveau bien",
      reference: str(fd, "reference"),
      stage: (str(fd, "stage") as PipelineStage) ?? "PROSPECTION",
      adresse: str(fd, "adresse"),
      codePostal: str(fd, "codePostal"),
      ville: str(fd, "ville"),
      prixEstime: int(fd, "prixEstime"),
      surface: int(fd, "surface"),
      nbPieces: int(fd, "nbPieces"),
      nbChambres: int(fd, "nbChambres"),
      raisonEstimation: (str(fd, "raisonEstimation") as EstimationReason) ?? null,
      copropriete,
      documents: {
        create: [
          ...BIEN_DOC_CHECKLIST,
          ...(copropriete ? COPRO_DOC_CHECKLIST : []),
        ].map((type) => ({
          type,
          libelle: DOC_TYPE_LABELS[type],
          statut: "MANQUANT" as DocStatus,
        })),
      },
    },
  });
  revalidatePath("/biens");
  revalidatePath("/pipeline");
  redirect(`/biens/${bien.id}`);
}

export async function updateBien(id: string, fd: FormData) {
  await prisma.bien.update({
    where: { id },
    data: {
      titre: reqStr(fd, "titre"),
      reference: str(fd, "reference"),
      adresse: str(fd, "adresse"),
      codePostal: str(fd, "codePostal"),
      ville: str(fd, "ville"),
      dateDecouverte: date(fd, "dateDecouverte"),
      datePropriete: date(fd, "datePropriete"),
      prixEstime: int(fd, "prixEstime"),
      prixMandat: int(fd, "prixMandat"),
      surface: int(fd, "surface"),
      surfaceTerrain: int(fd, "surfaceTerrain"),
      nbPieces: int(fd, "nbPieces"),
      nbChambres: int(fd, "nbChambres"),
      plans: boolOrNull(fd, "plans"),
      travauxMoins10Ans: boolOrNull(fd, "travauxMoins10Ans"),
      plainPied: boolOrNull(fd, "plainPied"),
      mitoyennete: str(fd, "mitoyennete"),
      typeConstruction: str(fd, "typeConstruction"),
      typeCouverture: str(fd, "typeCouverture"),
      typeCharpente: str(fd, "typeCharpente"),
      modeChauffage: str(fd, "modeChauffage"),
      modeEauChaude: str(fd, "modeEauChaude"),
      typeFenetres: str(fd, "typeFenetres"),
      diagnosticsNote: str(fd, "diagnosticsNote"),
      raisonEstimation: (str(fd, "raisonEstimation") as EstimationReason) ?? null,
      raisonEstimationNote: str(fd, "raisonEstimationNote"),
      professionProprietaire: str(fd, "professionProprietaire"),
      copropriete: bool(fd, "copropriete"),
      notes: str(fd, "notes"),
    },
  });
  revalidatePath(`/biens/${id}`);
  revalidatePath("/biens");
  revalidatePath("/pipeline");
}

export async function updateBienStage(id: string, stage: PipelineStage) {
  await prisma.bien.update({ where: { id }, data: { stage } });
  revalidatePath("/pipeline");
  revalidatePath("/biens");
  revalidatePath(`/biens/${id}`);
  revalidatePath("/");
}

/**
 * Persiste l'ordre du Kanban : met à jour l'étape ET la position des biens
 * des colonnes impactées (source + destination) en une transaction.
 */
export async function reorderBiens(
  updates: { id: string; stage: PipelineStage; position: number }[]
) {
  if (updates.length === 0) return;
  await prisma.$transaction(
    updates.map((u) =>
      prisma.bien.update({
        where: { id: u.id },
        data: { stage: u.stage, position: u.position },
      })
    )
  );
  revalidatePath("/pipeline");
  revalidatePath("/biens");
  revalidatePath("/");
}

export async function deleteBien(id: string) {
  await prisma.bien.delete({ where: { id } });
  revalidatePath("/biens");
  revalidatePath("/pipeline");
  redirect("/biens");
}

// --- Documents (checklist) ----------------------------------------------

export async function setDocStatus(docId: string, statut: DocStatus) {
  const doc = await prisma.document.update({
    where: { id: docId },
    data: {
      statut,
      dateRecu: statut === "RECU" ? new Date() : null,
    },
  });
  if (doc.bienId) revalidatePath(`/biens/${doc.bienId}`);
  if (doc.contactId) revalidatePath(`/contacts/${doc.contactId}`);
  revalidatePath("/");
}

export async function addDocument(fd: FormData) {
  const type = (str(fd, "type") as DocType) ?? "AUTRE";
  const doc = await prisma.document.create({
    data: {
      type,
      libelle: str(fd, "libelle") ?? DOC_TYPE_LABELS[type],
      statut: (str(fd, "statut") as DocStatus) ?? "MANQUANT",
      bienId: str(fd, "bienId"),
      contactId: str(fd, "contactId"),
    },
  });
  if (doc.bienId) revalidatePath(`/biens/${doc.bienId}`);
  if (doc.contactId) revalidatePath(`/contacts/${doc.contactId}`);
}

// --- Pièces (surfaces) ---------------------------------------------------

export async function addPiece(fd: FormData) {
  const bienId = reqStr(fd, "bienId");
  const count = await prisma.pieceSurface.count({ where: { bienId } });
  await prisma.pieceSurface.create({
    data: {
      bienId,
      nom: reqStr(fd, "nom") || "Pièce",
      surface: int(fd, "surface"),
      ordre: count,
    },
  });
  revalidatePath(`/biens/${bienId}`);
}

export async function deletePiece(id: string, bienId: string) {
  await prisma.pieceSurface.delete({ where: { id } });
  revalidatePath(`/biens/${bienId}`);
}

// --- Événements ----------------------------------------------------------

export async function addEvenement(fd: FormData) {
  const ev = await prisma.evenement.create({
    data: {
      type: (str(fd, "type") as EventType) ?? "AUTRE",
      titre: reqStr(fd, "titre") || "Événement",
      date: date(fd, "date") ?? new Date(),
      description: str(fd, "description"),
      bienId: str(fd, "bienId"),
      contactId: str(fd, "contactId"),
      partenaireId: str(fd, "partenaireId"),
    },
  });
  if (ev.bienId) revalidatePath(`/biens/${ev.bienId}`);
  if (ev.contactId) revalidatePath(`/contacts/${ev.contactId}`);
  if (ev.partenaireId) revalidatePath(`/partenaires/${ev.partenaireId}`);
  revalidatePath("/");
}

// --- Échanges ------------------------------------------------------------

export async function addEchange(fd: FormData) {
  const ex = await prisma.echange.create({
    data: {
      type: (str(fd, "type") as ExchangeType) ?? "NOTE",
      contenu: reqStr(fd, "contenu"),
      date: date(fd, "date") ?? new Date(),
      direction: str(fd, "direction"),
      contactId: str(fd, "contactId"),
      bienId: str(fd, "bienId"),
    },
  });
  if (ex.contactId) revalidatePath(`/contacts/${ex.contactId}`);
  if (ex.bienId) revalidatePath(`/biens/${ex.bienId}`);
  revalidatePath("/");
}

// --- Emails (Resend) -----------------------------------------------------

export type SendEmailResult = { ok: boolean; error?: string };

/**
 * Envoie un email via Resend et journalise l'échange (statut envoyé/échec).
 * Appelée directement depuis le client pour récupérer le résultat.
 */
export async function sendTemplateEmail(input: {
  to: string;
  subject: string;
  body: string;
  contactId?: string;
  bienId?: string;
  templateId?: string;
}): Promise<SendEmailResult> {
  const to = input.to?.trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: "Adresse email du destinataire invalide." };
  }
  const subject = input.subject?.trim() || "(sans objet)";
  const body = input.body ?? "";

  const result = await sendEmail({ to, subject, text: body });

  await prisma.echange.create({
    data: {
      type: "EMAIL",
      date: new Date(),
      direction: "sortant",
      contenu: `À : ${to}\nObjet : ${subject}\n\n${body}`,
      contactId: input.contactId || null,
      bienId: input.bienId || null,
      templateId: input.templateId || null,
      statutEnvoi: result.ok ? "ENVOYE" : "ECHEC",
    },
  });

  if (input.contactId) revalidatePath(`/contacts/${input.contactId}`);
  if (input.bienId) revalidatePath(`/biens/${input.bienId}`);
  revalidatePath("/");

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

// --- Contacts ------------------------------------------------------------

function parseRoles(fd: FormData): ContactRole[] {
  const roles = fd.getAll("roles").filter((r) => typeof r === "string") as ContactRole[];
  return roles;
}

export async function createContact(fd: FormData) {
  const contact = await prisma.contact.create({
    data: {
      civilite: str(fd, "civilite"),
      nom: reqStr(fd, "nom") || "Sans nom",
      prenom: str(fd, "prenom"),
      telephone: str(fd, "telephone"),
      email: str(fd, "email"),
      adresse: str(fd, "adresse"),
      codePostal: str(fd, "codePostal"),
      ville: str(fd, "ville"),
      roles: parseRoles(fd),
      profession: str(fd, "profession"),
      situationFamiliale: str(fd, "situationFamiliale"),
      notes: str(fd, "notes"),
    },
  });
  revalidatePath("/contacts");
  redirect(`/contacts/${contact.id}`);
}

export async function updateContact(id: string, fd: FormData) {
  await prisma.contact.update({
    where: { id },
    data: {
      civilite: str(fd, "civilite"),
      nom: reqStr(fd, "nom"),
      prenom: str(fd, "prenom"),
      telephone: str(fd, "telephone"),
      email: str(fd, "email"),
      adresse: str(fd, "adresse"),
      codePostal: str(fd, "codePostal"),
      ville: str(fd, "ville"),
      roles: parseRoles(fd),
      profession: str(fd, "profession"),
      situationFamiliale: str(fd, "situationFamiliale"),
      notes: str(fd, "notes"),
    },
  });
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
}

export async function deleteContact(id: string) {
  await prisma.contact.delete({ where: { id } });
  revalidatePath("/contacts");
  redirect("/contacts");
}

// --- Recherches ----------------------------------------------------------

export async function addRecherche(fd: FormData) {
  const contactId = reqStr(fd, "contactId");
  await prisma.recherche.create({
    data: {
      contactId,
      titre: str(fd, "titre"),
      typeBien: str(fd, "typeBien"),
      secteur: str(fd, "secteur"),
      budgetMin: int(fd, "budgetMin"),
      budgetMax: int(fd, "budgetMax"),
      surfaceMin: int(fd, "surfaceMin"),
      nbChambresMin: int(fd, "nbChambresMin"),
      notes: str(fd, "notes"),
    },
  });
  revalidatePath(`/contacts/${contactId}`);
}

export async function deleteRecherche(id: string, contactId: string) {
  await prisma.recherche.delete({ where: { id } });
  revalidatePath(`/contacts/${contactId}`);
}

/** Lie un bien existant à un contact (propriétaire). */
export async function linkBienToContact(contactId: string, bienId: string) {
  await prisma.contact.update({
    where: { id: contactId },
    data: { biens: { connect: { id: bienId } } },
  });
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/biens/${bienId}`);
}

export async function unlinkBienFromContact(contactId: string, bienId: string) {
  await prisma.contact.update({
    where: { id: contactId },
    data: { biens: { disconnect: { id: bienId } } },
  });
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/biens/${bienId}`);
}

// --- Partenaires ---------------------------------------------------------

export async function createPartenaire(fd: FormData) {
  const p = await prisma.partenaire.create({
    data: {
      nom: reqStr(fd, "nom") || "Nouveau partenaire",
      type: (str(fd, "type") as PartenaireType) ?? "AUTRE",
      specialite: str(fd, "specialite"),
      societe: str(fd, "societe"),
      telephone: str(fd, "telephone"),
      email: str(fd, "email"),
      adresse: str(fd, "adresse"),
      notes: str(fd, "notes"),
      nbAffaires: int(fd, "nbAffaires") ?? 0,
    },
  });
  revalidatePath("/partenaires");
  redirect(`/partenaires/${p.id}`);
}

export async function updatePartenaire(id: string, fd: FormData) {
  await prisma.partenaire.update({
    where: { id },
    data: {
      nom: reqStr(fd, "nom"),
      type: (str(fd, "type") as PartenaireType) ?? "AUTRE",
      specialite: str(fd, "specialite"),
      societe: str(fd, "societe"),
      telephone: str(fd, "telephone"),
      email: str(fd, "email"),
      adresse: str(fd, "adresse"),
      notes: str(fd, "notes"),
      nbAffaires: int(fd, "nbAffaires") ?? 0,
    },
  });
  revalidatePath(`/partenaires/${id}`);
  revalidatePath("/partenaires");
}

export async function deletePartenaire(id: string) {
  await prisma.partenaire.delete({ where: { id } });
  revalidatePath("/partenaires");
  redirect("/partenaires");
}
