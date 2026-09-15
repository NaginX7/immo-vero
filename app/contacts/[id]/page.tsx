import { notFound } from "next/navigation";
import {
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Users2,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  Tags,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { deleteContact } from "@/lib/actions";
import { formatDate, initials } from "@/lib/utils";
import { isTracfinOk } from "@/lib/domain";
import { PageHeader } from "@/components/layout/page-header";
import { RoleBadge } from "@/components/badges";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import { BiensRecherchesTab } from "@/components/contacts/biens-recherches";
import { DocChecklist } from "@/components/biens/doc-checklist";
import { AddDocumentDialog } from "@/components/documents/add-document-dialog";
import { DeleteButton } from "@/components/delete-button";
import {
  ConvertirEnPartenaireButton,
  SegmentBadge,
} from "@/components/contacts/conversion-buttons";
import { AddEvenementDialog } from "@/components/timeline/add-evenement-dialog";
import { AddEchangeDialog } from "@/components/timeline/add-echange-dialog";
import { SendEmailDialog } from "@/components/email/send-email-dialog";
import { EvenementList, EchangeList } from "@/components/timeline/lists";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: typeof Phone;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      {children}
    </p>
  );
}

export default async function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAuth();
  const [contact, allBiens, emailTemplates] = await Promise.all([
    prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        evenements: {
          orderBy: { date: "desc" },
          include: { bien: true, contact: true },
        },
        echanges: {
          orderBy: { date: "desc" },
          include: { bien: true, contact: true },
        },
        recherches: { orderBy: { createdAt: "desc" } },
        segments: { select: { id: true, nom: true }, orderBy: { nom: "asc" } },
        biens: true,
        apporteurPour: {
          select: {
            id: true,
            titre: true,
            ville: true,
            stage: true,
            prixEstime: true,
            prixMandat: true,
          },
        },
        documents: {
          orderBy: { createdAt: "asc" },
          include: { fichiers: { orderBy: { createdAt: "asc" } } },
        },
      },
    }),
    prisma.bien.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        titre: true,
        ville: true,
        stage: true,
        prixEstime: true,
        prixMandat: true,
      },
    }),
    prisma.template.findMany({
      where: { canal: "EMAIL" },
      select: { id: true, nom: true, objet: true, corps: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  if (!contact) notFound();

  const fullName = `${contact.prenom ?? ""} ${contact.nom}`.trim();
  const linkedIds = new Set(contact.biens.map((b) => b.id));
  const availableBiens = allBiens.filter((b) => !linkedIds.has(b.id));
  const linkedBiens = allBiens.filter((b) => linkedIds.has(b.id));
  const tracfin = isTracfinOk(contact.documents);
  const hasTracfinDocs = contact.documents.length > 0;

  // Contexte pour l'envoi d'email : biens liés (propriétaire + via événements)
  // et rendez-vous du contact, pour pré-remplir {adresse_bien}, {prix}, {date_rdv}…
  const bienMap = new Map<
    string,
    { id: string; titre: string; adresse: string | null; ville: string | null; prix: number | null }
  >();
  for (const b of contact.biens) {
    bienMap.set(b.id, {
      id: b.id,
      titre: b.titre,
      adresse: b.adresse,
      ville: b.ville,
      prix: b.prixMandat ?? b.prixEstime,
    });
  }
  for (const ev of contact.evenements) {
    if (ev.bien && !bienMap.has(ev.bien.id)) {
      bienMap.set(ev.bien.id, {
        id: ev.bien.id,
        titre: ev.bien.titre,
        adresse: ev.bien.adresse,
        ville: ev.bien.ville,
        prix: ev.bien.prixMandat ?? ev.bien.prixEstime,
      });
    }
  }
  const emailBiens = Array.from(bienMap.values());
  const emailEvents = contact.evenements.map((ev) => ({
    id: ev.id,
    type: ev.type,
    titre: ev.titre,
    date: ev.date.toISOString(),
    bienId: ev.bienId,
  }));

  return (
    <div>
      <PageHeader title={fullName} backHref="/contacts">
        <ContactFormDialog contact={contact} />
        <ConvertirEnPartenaireButton contactId={contact.id} />
        <DeleteButton action={deleteContact.bind(null, contact.id)} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Zone Infos */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-100 text-lg font-semibold text-navy-700">
                  {initials(fullName)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-navy-800">
                    {contact.civilite ? `${contact.civilite} ` : ""}
                    {fullName}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {contact.roles.map((r) => (
                      <RoleBadge key={r} role={r} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {contact.telephone && (
                  <InfoRow icon={Phone}>{contact.telephone}</InfoRow>
                )}
                {contact.email && <InfoRow icon={Mail}>{contact.email}</InfoRow>}
                {(contact.adresse || contact.ville) && (
                  <InfoRow icon={MapPin}>
                    {[contact.adresse, contact.codePostal, contact.ville]
                      .filter(Boolean)
                      .join(", ")}
                  </InfoRow>
                )}
                {contact.profession && (
                  <InfoRow icon={Briefcase}>{contact.profession}</InfoRow>
                )}
                {contact.situationFamiliale && (
                  <InfoRow icon={Users2}>{contact.situationFamiliale}</InfoRow>
                )}
                <InfoRow icon={CalendarDays}>
                  Fiche créée le {formatDate(contact.createdAt)}
                </InfoRow>
              </div>

              {contact.segments.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  {contact.segments.map((sg) => (
                    <SegmentBadge key={sg.id} contactId={contact.id} segment={sg} />
                  ))}
                </div>
              )}

              {contact.notes && (
                <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  {contact.notes}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Documents / TRACFIN */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Pièces justificatives</CardTitle>
              <AddDocumentDialog contactId={contact.id} />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "mb-4 flex items-center gap-2 rounded-md border p-3 text-sm",
                  tracfin
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
                )}
              >
                {tracfin ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                )}
                <span className="font-medium">
                  {!hasTracfinDocs
                    ? "Aucune pièce TRACFIN enregistrée"
                    : tracfin
                    ? "Pièces d'identité / origine des fonds OK"
                    : "Pièce d'identité ou origine des fonds à collecter"}
                </span>
              </div>
              {contact.documents.length > 0 ? (
                <DocChecklist documents={contact.documents} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ajoutez la pièce d&apos;identité et, pour un acquéreur,
                  l&apos;origine des fonds.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Zone Contenu & liens */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <Tabs defaultValue="evenements">
                <TabsList>
                  <TabsTrigger value="evenements">Événements</TabsTrigger>
                  <TabsTrigger value="echanges">Échanges</TabsTrigger>
                  <TabsTrigger value="biens">Biens & Recherches</TabsTrigger>
                </TabsList>

                <TabsContent value="evenements">
                  <div className="mb-4 flex justify-end">
                    <AddEvenementDialog
                      contactId={contact.id}
                      label="Événement"
                    />
                  </div>
                  <EvenementList events={contact.evenements} />
                </TabsContent>

                <TabsContent value="echanges">
                  <div className="mb-4 flex justify-end gap-2">
                    <SendEmailDialog
                      emailTemplates={emailTemplates}
                      contact={{
                        id: contact.id,
                        nom: contact.nom,
                        prenom: contact.prenom,
                        email: contact.email,
                      }}
                      biens={emailBiens}
                      events={emailEvents}
                      triggerLabel="Envoyer un email"
                      triggerVariant="accent"
                      triggerSize="sm"
                    />
                    <AddEchangeDialog contactId={contact.id} label="Échange" />
                  </div>
                  <EchangeList echanges={contact.echanges} />
                </TabsContent>

                <TabsContent value="biens">
                  <BiensRecherchesTab
                    contactId={contact.id}
                    linkedBiens={linkedBiens}
                    availableBiens={availableBiens}
                    recherches={contact.recherches}
                    apporteurBiens={contact.apporteurPour}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
