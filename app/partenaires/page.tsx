import Link from "next/link";
import { Phone, Mail, Handshake } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { PARTENAIRE_TYPE_LABELS } from "@/lib/labels";
import { PageHeader } from "@/components/layout/page-header";
import { PartenaireFormDialog } from "@/components/partenaires/partenaire-form-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export default async function PartenairesPage() {
  await requireAuth();
  const partenaires = await prisma.partenaire.findMany({
    orderBy: { nbAffaires: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Partenaires"
        subtitle={`${partenaires.length} partenaire${partenaires.length > 1 ? "s" : ""}`}
      >
        <PartenaireFormDialog />
      </PageHeader>

      {partenaires.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Aucun partenaire pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {partenaires.map((p) => (
            <Link key={p.id} href={`/partenaires/${p.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="secondary">
                      {PARTENAIRE_TYPE_LABELS[p.type]}
                    </Badge>
                    <div className="flex items-center gap-1 text-coral-600">
                      <Handshake className="h-4 w-4" />
                      <span className="text-sm font-bold">{p.nbAffaires}</span>
                    </div>
                  </div>
                  <h3 className="mt-3 font-semibold text-navy-800">{p.nom}</h3>
                  {p.societe && (
                    <p className="text-sm text-muted-foreground">{p.societe}</p>
                  )}
                  {p.specialite && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.specialite}
                    </p>
                  )}
                  <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                    {p.telephone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" /> {p.telephone}
                      </p>
                    )}
                    {p.email && (
                      <p className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5" /> {p.email}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
