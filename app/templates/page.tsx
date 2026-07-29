import { Info } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { TEMPLATE_CATEGORY_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/layout/page-header";
import { TemplateCard } from "@/components/templates/template-card";
import { Card, CardContent } from "@/components/ui/card";
import type { TemplateCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER: TemplateCategory[] = [
  "RELANCE_VENDEUR",
  "RELANCE_ACQUEREUR",
  "CR_POST_VISITE",
  "RAPPEL_RDV_VEILLE",
  "RESEAU_APPORTEURS",
  "AUTRE",
];

export default async function TemplatesPage() {
  const [templates, contacts, biens] = await Promise.all([
    prisma.template.findMany({ orderBy: { nom: "asc" } }),
    prisma.contact.findMany({
      where: { email: { not: null } },
      select: { id: true, nom: true, prenom: true, email: true },
      orderBy: [{ nom: "asc" }],
    }),
    prisma.bien.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        titre: true,
        adresse: true,
        ville: true,
        prixMandat: true,
        prixEstime: true,
      },
    }),
  ]);

  const emailTemplates = templates
    .filter((t) => t.canal === "EMAIL")
    .map((t) => ({ id: t.id, nom: t.nom, objet: t.objet, corps: t.corps }));

  const emailBiens = biens.map((b) => ({
    id: b.id,
    titre: b.titre,
    adresse: b.adresse,
    ville: b.ville,
    prix: b.prixMandat ?? b.prixEstime,
  }));

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: templates.filter((t) => t.categorie === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <PageHeader
        title="Bibliothèque de templates"
        subtitle="SMS & emails prêts à l'emploi — copier / coller"
      />

      <Card className="mb-6 border-powder-200 bg-powder-50/50">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" />
          <div className="text-muted-foreground">
            <p>
              Les variables entre accolades (ex :{" "}
              <span className="rounded bg-powder-100 px-1 font-medium text-coral-600">
                {"{prénom}"}
              </span>
              ) sont à remplacer avant envoi. Vouvoiement pour les clients,
              tutoiement pour le réseau d&apos;apporteurs.
            </p>
            <p className="mt-1 text-xs">
              Signatures — SMS : «&nbsp;Véronique Noureddine — L&apos;Immobilière&nbsp;»
              · Email : «&nbsp;Véronique Noureddine / L&apos;Immobilière de
              Saverne&nbsp;». Les emails s&apos;envoient directement via Resend
              (bouton «&nbsp;Envoyer&nbsp;») ; les SMS restent en copier-coller.
            </p>
          </div>
        </CardContent>
      </Card>

      {byCategory.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Aucun template pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {byCategory.map((group) => (
            <section key={group.category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-700">
                {TEMPLATE_CATEGORY_LABELS[group.category]}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {group.items.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    emailTemplates={emailTemplates}
                    contacts={contacts}
                    biens={emailBiens}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
