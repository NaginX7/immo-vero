import { notFound } from "next/navigation";
import { Phone, Mail, MapPin, Handshake, Building } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { deletePartenaire } from "@/lib/actions";
import { PARTENAIRE_TYPE_LABELS, PARTENAIRE_EVENT_TYPES } from "@/lib/labels";
import { PageHeader } from "@/components/layout/page-header";
import { PartenaireFormDialog } from "@/components/partenaires/partenaire-form-dialog";
import { AddEvenementDialog } from "@/components/timeline/add-evenement-dialog";
import { EvenementList } from "@/components/timeline/lists";
import { DeleteButton } from "@/components/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PartenaireDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const partenaire = await prisma.partenaire.findUnique({
    where: { id: params.id },
    include: {
      evenements: {
        orderBy: { date: "desc" },
        include: { bien: true, contact: true },
      },
    },
  });

  if (!partenaire) notFound();

  return (
    <div>
      <PageHeader
        title={partenaire.nom}
        subtitle={partenaire.societe ?? undefined}
        backHref="/partenaires"
      >
        <PartenaireFormDialog partenaire={partenaire} />
        <DeleteButton action={deletePartenaire.bind(null, partenaire.id)} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {PARTENAIRE_TYPE_LABELS[partenaire.type]}
                </Badge>
                <div className="flex items-center gap-1.5 rounded-full bg-powder-50 px-3 py-1 text-coral-600">
                  <Handshake className="h-4 w-4" />
                  <span className="text-sm font-bold">
                    {partenaire.nbAffaires}
                  </span>
                  <span className="text-xs">affaire(s)</span>
                </div>
              </div>

              {partenaire.specialite && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {partenaire.specialite}
                </p>
              )}

              <div className="mt-4 space-y-2 text-sm">
                {partenaire.societe && (
                  <p className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    {partenaire.societe}
                  </p>
                )}
                {partenaire.telephone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {partenaire.telephone}
                  </p>
                )}
                {partenaire.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {partenaire.email}
                  </p>
                )}
                {partenaire.adresse && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {partenaire.adresse}
                  </p>
                )}
              </div>

              {partenaire.notes && (
                <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  {partenaire.notes}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                Affaires & recommandations
              </CardTitle>
              <AddEvenementDialog
                partenaireId={partenaire.id}
                label="Ajouter"
                title="Apport d'affaire / recommandation"
                types={PARTENAIRE_EVENT_TYPES}
                titrePlaceholder="Ex : apport famille Muller / reco courtier"
              />
            </CardHeader>
            <CardContent>
              <EvenementList events={partenaire.evenements} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
