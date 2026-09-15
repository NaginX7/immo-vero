import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ShieldCheck, ShieldAlert, User } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { deleteBien } from "@/lib/actions";
import {
  ESTIMATION_REASON_LABELS,
  DOC_TYPE_LABELS,
} from "@/lib/labels";
import { isTracfinOk, tracfinMissing } from "@/lib/domain";
import { evaluerCorrespondance } from "@/lib/matching";
import { formatEuro, formatDate, cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StageBadge } from "@/components/badges";
import { StageSelect } from "@/components/biens/stage-select";
import { BienFormDialog } from "@/components/biens/bien-form-dialog";
import { DocChecklist } from "@/components/biens/doc-checklist";
import { PiecesEditor } from "@/components/biens/pieces-editor";
import { ApporteurBlock } from "@/components/biens/apporteur-block";
import {
  AcheteursCompatibles,
  type AcheteurMatch,
} from "@/components/biens/acheteurs-compatibles";
import { DeleteButton } from "@/components/delete-button";
import { AddEvenementDialog } from "@/components/timeline/add-evenement-dialog";
import { AddEchangeDialog } from "@/components/timeline/add-echange-dialog";
import { EvenementList, EchangeList } from "@/components/timeline/lists";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

function yn(v: boolean | null | undefined) {
  return v === true ? "Oui" : v === false ? "Non" : "—";
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

export default async function BienDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAuth();
  const bien = await prisma.bien.findUnique({
    where: { id: params.id },
    include: {
      documents: {
        orderBy: { createdAt: "asc" },
        include: { fichiers: { orderBy: { createdAt: "asc" } } },
      },
      pieces: { orderBy: { ordre: "asc" } },
      proprietaires: true,
      apporteur: {
        select: { id: true, nom: true, prenom: true, telephone: true, email: true },
      },
      evenements: {
        orderBy: { date: "desc" },
        include: { contact: true, bien: true },
      },
      echanges: {
        // Épinglés en tête (du plus récemment épinglé), puis par date
        orderBy: [{ epingleAt: { sort: "desc", nulls: "last" } }, { date: "desc" }],
        include: { contact: true, bien: true },
      },
    },
  });

  if (!bien) notFound();

  const tracfin = isTracfinOk(bien.documents);
  const tracfinMiss = tracfinMissing(bien.documents);

  // Notaires proposés lors du passage en compromis
  const notaires = await prisma.partenaire.findMany({
    where: { type: "NOTAIRE" },
    select: { id: true, nom: true, societe: true, telephone: true, email: true },
    orderBy: { nom: "asc" },
  });

  // Contacts proposés pour désigner l'apporteur d'affaire
  const contactsPourApporteur = await prisma.contact.findMany({
    select: { id: true, nom: true, prenom: true, telephone: true, email: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  // --- Acheteurs compatibles ---------------------------------------------
  const recherches = await prisma.recherche.findMany({
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });

  const criteresBien = {
    titre: bien.titre,
    ville: bien.ville,
    prix: bien.prixMandat ?? bien.prixEstime,
    surface: bien.surface,
    nbPieces: bien.nbPieces,
    nbChambres: bien.nbChambres,
    typeConstruction: bien.typeConstruction,
  };

  const proprietaireIds = new Set(bien.proprietaires.map((p) => p.id));

  const matches: AcheteurMatch[] = recherches
    // On exclut les propriétaires du bien : ils ne sont pas acquéreurs ici
    .filter((r) => !proprietaireIds.has(r.contactId))
    .map((r) => {
      const res = evaluerCorrespondance(criteresBien, r);
      return {
        contactId: r.contact.id,
        nom: r.contact.nom,
        prenom: r.contact.prenom,
        email: r.contact.email,
        telephone: r.contact.telephone,
        rechercheTitre: r.titre,
        criteres: res.criteres,
        manques: res.manques,
        respectes: res.respectes,
        evalues: res.evalues,
        compatible: res.compatible,
      };
    })
    .sort((a, b) => {
      if (a.compatible !== b.compatible) return a.compatible ? -1 : 1;
      if (a.manques.length !== b.manques.length)
        return a.manques.length - b.manques.length;
      return b.respectes - a.respectes;
    });

  return (
    <div>
      <PageHeader
        title={bien.titre}
        subtitle={[bien.adresse, bien.codePostal, bien.ville]
          .filter(Boolean)
          .join(" · ")}
        backHref="/biens"
      >
        <StageSelect
          bienId={bien.id}
          bienTitre={bien.titre}
          stage={bien.stage}
          notaires={notaires}
        />
        <AcheteursCompatibles matches={matches} />
        <BienFormDialog bien={bien} />
        <DeleteButton action={deleteBien.bind(null, bien.id)} />
      </PageHeader>

      {/* Bandeau TRACFIN */}
      <div
        className={cn(
          "mb-6 flex items-center gap-3 rounded-lg border p-4",
          tracfin
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        )}
      >
        {tracfin ? (
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
        )}
        <div className="text-sm">
          <p className="font-medium">
            {tracfin
              ? "Pièces TRACFIN réunies"
              : "Vigilance TRACFIN — pièces manquantes"}
          </p>
          {!tracfin && tracfinMiss.length > 0 && (
            <p className="text-muted-foreground">
              Manque : {tracfinMiss.map((t) => DOC_TYPE_LABELS[t]).join(", ")}
            </p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StageBadge stage={bien.stage} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Caractéristiques */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-navy-500" /> Caractéristiques
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-x-8 sm:grid-cols-2">
              <div>
                <Row
                  label="Prix estimé"
                  value={formatEuro(bien.prixEstime)}
                />
                <Row label="Prix au mandat" value={formatEuro(bien.prixMandat)} />
                <Row
                  label="Prix de vente définitif"
                  value={formatEuro(bien.prixVenteDefinitif)}
                />
                <Row
                  label="Surface habitable"
                  value={bien.surface ? `${bien.surface} m²` : "—"}
                />
                <Row
                  label="Terrain"
                  value={bien.surfaceTerrain ? `${bien.surfaceTerrain} m²` : "—"}
                />
                <Row label="Nb pièces" value={bien.nbPieces} />
                <Row label="Nb chambres" value={bien.nbChambres} />
                <Row label="Mitoyenneté" value={bien.mitoyennete} />
                <Row label="Plain-pied" value={yn(bien.plainPied)} />
                <Row label="Plans disponibles" value={yn(bien.plans)} />
                <Row label="Travaux -10 ans" value={yn(bien.travauxMoins10Ans)} />
              </div>
              <div>
                <Row label="Type de construction" value={bien.typeConstruction} />
                <Row label="Couverture" value={bien.typeCouverture} />
                <Row label="Charpente" value={bien.typeCharpente} />
                <Row label="Chauffage" value={bien.modeChauffage} />
                <Row label="Eau chaude" value={bien.modeEauChaude} />
                <Row label="Fenêtres / vitrages" value={bien.typeFenetres} />
                <Row
                  label="Date de découverte"
                  value={formatDate(bien.dateDecouverte)}
                />
                <Row
                  label="Date de propriété"
                  value={formatDate(bien.datePropriete)}
                />
                <Row
                  label="Copropriété"
                  value={
                    bien.copropriete ? (
                      <Badge variant="secondary">Oui</Badge>
                    ) : (
                      "Non"
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Estimation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contexte d&apos;estimation</CardTitle>
            </CardHeader>
            <CardContent>
              <Row
                label="Raison"
                value={
                  bien.raisonEstimation
                    ? ESTIMATION_REASON_LABELS[bien.raisonEstimation]
                    : "—"
                }
              />
              <Row label="Précision" value={bien.raisonEstimationNote} />
              <Row
                label="Profession du propriétaire"
                value={bien.professionProprietaire}
              />
              {bien.diagnosticsNote && (
                <Row label="Diagnostics" value={bien.diagnosticsNote} />
              )}
            </CardContent>
          </Card>

          {/* Surfaces par pièce */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Surfaces par pièce</CardTitle>
            </CardHeader>
            <CardContent>
              <PiecesEditor bienId={bien.id} pieces={bien.pieces} />
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Événements</CardTitle>
              <AddEvenementDialog bienId={bien.id} label="Événement" />
            </CardHeader>
            <CardContent>
              <EvenementList events={bien.evenements} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Échanges & notes</CardTitle>
              <AddEchangeDialog bienId={bien.id} label="Échange" />
            </CardHeader>
            <CardContent>
              <EchangeList echanges={bien.echanges} />
            </CardContent>
          </Card>

          {bien.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes libres</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {bien.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Checklist documentaire */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Checklist documentaire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocChecklist documents={bien.documents} />
              <p className="mt-3 text-xs text-muted-foreground">
                Joignez le fichier d&apos;une pièce pour la passer en « Reçu »,
                ou marquez-la « Non applicable ».
              </p>
            </CardContent>
          </Card>

          {/* Propriétaires */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Propriétaire(s)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bien.proprietaires.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun propriétaire lié.
                </p>
              )}
              {bien.proprietaires.map((p) => (
                <Link
                  key={p.id}
                  href={`/contacts/${p.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-50 text-navy-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {`${p.prenom ?? ""} ${p.nom}`.trim()}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.telephone ?? p.email ?? "—"}
                    </p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Apporteur d'affaire */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Apporteur d&apos;affaire</CardTitle>
            </CardHeader>
            <CardContent>
              <ApporteurBlock
                bienId={bien.id}
                apporteur={bien.apporteur}
                contacts={contactsPourApporteur}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
