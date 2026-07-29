import { prisma } from "@/lib/prisma";
import { docStats, isTracfinOk } from "@/lib/domain";
import { PageHeader } from "@/components/layout/page-header";
import { BienFormDialog } from "@/components/biens/bien-form-dialog";
import { KanbanBoard, type KanbanCard } from "@/components/kanban/board";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  await requireAuth();
  const [biens, notaires] = await Promise.all([
    prisma.bien.findMany({
      where: { archive: false },
      include: { documents: true },
      orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
    }),
    // Proposés lorsqu'un bien est déposé dans la colonne « Compromis »
    prisma.partenaire.findMany({
      where: { type: "NOTAIRE" },
      select: { id: true, nom: true, societe: true, telephone: true, email: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  const cards: KanbanCard[] = biens.map((b) => {
    const stats = docStats(b.documents);
    return {
      id: b.id,
      titre: b.titre,
      ville: b.ville,
      prix: b.prixMandat ?? b.prixEstime,
      stage: b.stage,
      docsRecus: stats.recus,
      docsTotal: stats.total,
      tracfinOk: isTracfinOk(b.documents),
    };
  });

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle="Glissez-déposez les biens entre les étapes de votre process"
      >
        <BienFormDialog />
      </PageHeader>
      <KanbanBoard cards={cards} notaires={notaires} />
    </div>
  );
}
