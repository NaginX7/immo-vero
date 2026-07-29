"use client";

import { useRef, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { PieceSurface } from "@prisma/client";

import { addPiece, deletePiece } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PiecesEditor({
  bienId,
  pieces,
}: {
  bienId: string;
  pieces: PieceSurface[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const total = pieces.reduce((acc, p) => acc + (p.surface ?? 0), 0);

  return (
    <div className="space-y-3">
      {pieces.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {pieces.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-4 py-2 text-sm"
            >
              <span>{p.nom}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {p.surface ? `${p.surface} m²` : "—"}
                </span>
                <button
                  onClick={() => start(() => deletePiece(p.id, bienId))}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Supprimer la pièce"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
          <li className="flex items-center justify-between bg-muted/50 px-4 py-2 text-sm font-medium">
            <span>Total</span>
            <span>{total} m²</span>
          </li>
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucune pièce renseignée.
        </p>
      )}

      <form
        ref={formRef}
        action={(fd) =>
          start(async () => {
            await addPiece(fd);
            formRef.current?.reset();
          })
        }
        className="flex items-end gap-2"
      >
        <input type="hidden" name="bienId" value={bienId} />
        <div className="flex-1">
          <Input name="nom" placeholder="Nom de la pièce (ex: Salon)" required />
        </div>
        <div className="w-24">
          <Input name="surface" type="number" step="0.1" placeholder="m²" />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </form>
    </div>
  );
}
