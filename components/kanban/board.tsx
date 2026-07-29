"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  ArrowUpRight,
  ShieldAlert,
  MapPin,
  SlidersHorizontal,
  EyeOff,
} from "lucide-react";
import type { PipelineStage } from "@prisma/client";

import { reorderBiens } from "@/lib/actions";
import { PIPELINE_ORDER, STAGE_LABELS } from "@/lib/labels";
import { formatEuro, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const STORAGE_KEY = "giorgio-immo:kanban-columns";

export type KanbanCard = {
  id: string;
  titre: string;
  ville: string | null;
  prix: number | null;
  stage: PipelineStage;
  docsRecus: number;
  docsTotal: number;
  tracfinOk: boolean;
};

function groupByStage(cards: KanbanCard[]): Record<PipelineStage, KanbanCard[]> {
  const map = Object.fromEntries(
    PIPELINE_ORDER.map((s) => [s, [] as KanbanCard[]])
  ) as Record<PipelineStage, KanbanCard[]>;
  for (const c of cards) map[c.stage].push(c);
  return map;
}

export function KanbanBoard({ cards }: { cards: KanbanCard[] }) {
  const [columns, setColumns] = useState(() => groupByStage(cards));
  const [visible, setVisible] = useState<PipelineStage[]>(PIPELINE_ORDER);
  const [, start] = useTransition();

  // Restaure les colonnes choisies (après le montage, pour éviter tout
  // décalage d'hydratation avec le rendu serveur).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as string[];
      const valid = PIPELINE_ORDER.filter((s) => saved.includes(s));
      if (valid.length > 0) setVisible(valid);
    } catch {
      // stockage indisponible — on garde toutes les colonnes
    }
  }, []);

  function persist(next: PipelineStage[]) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function toggleColumn(stage: PipelineStage) {
    setVisible((prev) => {
      const next = prev.includes(stage)
        ? prev.filter((s) => s !== stage)
        : PIPELINE_ORDER.filter((s) => prev.includes(s) || s === stage);
      // On garde au moins une colonne visible
      if (next.length === 0) return prev;
      persist(next);
      return next;
    });
  }

  function showAll() {
    setVisible(PIPELINE_ORDER);
    persist(PIPELINE_ORDER);
  }

  function onDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;
    const from = source.droppableId as PipelineStage;
    const to = destination.droppableId as PipelineStage;
    if (from === to && source.index === destination.index) return;

    // Calcule le nouvel état
    const next = { ...columns, [from]: Array.from(columns[from]) };
    const [moved] = next[from].splice(source.index, 1);
    if (from === to) {
      next[from].splice(destination.index, 0, moved);
    } else {
      next[to] = Array.from(columns[to]);
      next[to].splice(destination.index, 0, { ...moved, stage: to });
    }
    setColumns(next);

    // Persiste l'ordre (et l'étape) des colonnes impactées
    const affected = from === to ? [from] : [from, to];
    const updates = affected.flatMap((stage) =>
      next[stage].map((c, i) => ({ id: c.id, stage, position: i }))
    );
    start(() => reorderBiens(updates));
  }

  const shownStages = PIPELINE_ORDER.filter((s) => visible.includes(s));
  const hiddenCount = PIPELINE_ORDER.length - shownStages.length;
  const hiddenCards = PIPELINE_ORDER.filter(
    (s) => !visible.includes(s)
  ).reduce((acc, s) => acc + columns[s].length, 0);

  return (
    <div>
      {/* Barre d'outils : personnalisation des colonnes */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {shownStages.length}/{PIPELINE_ORDER.length} colonnes affichées
          {hiddenCards > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
              <EyeOff className="h-3.5 w-3.5" />
              {hiddenCards} bien(s) masqué(s)
            </span>
          )}
        </p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="h-4 w-4" />
              Colonnes
              {hiddenCount > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
                  {shownStages.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Colonnes affichées</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PIPELINE_ORDER.map((stage) => (
              <DropdownMenuCheckboxItem
                key={stage}
                checked={visible.includes(stage)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => toggleColumn(stage)}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  {STAGE_LABELS[stage]}
                  <span className="text-xs text-muted-foreground">
                    {columns[stage].length}
                  </span>
                </span>
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => showAll()}>
              Tout afficher
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-4">
          {shownStages.map((stage) => {
            const list = columns[stage];
            return (
              <div key={stage} className="flex w-[280px] shrink-0 flex-col">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-navy-800">
                    {STAGE_LABELS[stage]}
                  </h3>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                    {list.length}
                  </span>
                </div>
                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex-1 space-y-2 rounded-lg border border-dashed border-transparent p-2 transition-colors",
                        snapshot.isDraggingOver
                          ? "border-coral-300 bg-powder-50"
                          : "bg-muted/40"
                      )}
                    >
                      {list.map((card, index) => (
                        <Draggable
                          key={card.id}
                          draggableId={card.id}
                          index={index}
                        >
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={cn(
                                "group rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow",
                                snap.isDragging &&
                                  "shadow-lg ring-2 ring-coral-300"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium leading-tight text-navy-800">
                                  {card.titre}
                                </p>
                                <Link
                                  href={`/biens/${card.id}`}
                                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-coral-600 group-hover:opacity-100"
                                  aria-label="Ouvrir la fiche"
                                >
                                  <ArrowUpRight className="h-4 w-4" />
                                </Link>
                              </div>
                              {card.ville && (
                                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" /> {card.ville}
                                </p>
                              )}
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm font-semibold text-coral-600">
                                  {formatEuro(card.prix)}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {!card.tracfinOk && (
                                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                  <span className="text-[11px] text-muted-foreground">
                                    {card.docsRecus}/{card.docsTotal} docs
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {list.length === 0 && !snapshot.isDraggingOver && (
                        <p className="py-6 text-center text-xs text-muted-foreground">
                          —
                        </p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
