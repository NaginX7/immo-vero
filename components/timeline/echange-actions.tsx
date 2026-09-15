"use client";

import { useTransition } from "react";
import { Loader2, Pin, PinOff, Trash2 } from "lucide-react";

import { deleteEchange, toggleEpingleEchange } from "@/lib/actions";
import { cn } from "@/lib/utils";

const ECHEC = "L'opération a échoué. Rechargez la page et réessayez.";

/**
 * Boutons Épingler / Supprimer d'un échange. Placés dans le <summary> du
 * repli : chaque clic est stoppé pour ne pas ouvrir ou fermer l'échange.
 */
export function EchangeActions({ id, epingle }: { id: string; epingle: boolean }) {
  const [pending, start] = useTransition();

  function lancer(e: React.MouseEvent, action: () => Promise<void>, confirmation?: string) {
    e.preventDefault();
    e.stopPropagation();
    if (confirmation && !window.confirm(confirmation)) return;
    start(async () => {
      try {
        await action();
      } catch {
        window.alert(ECHEC);
      }
    });
  }

  const btn =
    "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors disabled:opacity-50";

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      <button
        type="button"
        disabled={pending}
        onClick={(e) => lancer(e, () => toggleEpingleEchange(id))}
        className={cn(btn, epingle ? "text-coral-600 hover:bg-powder-100" : "hover:bg-muted hover:text-foreground")}
        title={epingle ? "Désépingler" : "Épingler en tête de liste"}
        aria-label={epingle ? "Désépingler" : "Épingler"}
      >
        {epingle ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={(e) =>
          lancer(e, () => deleteEchange(id), "Supprimer cet échange ? Cette action est irréversible.")
        }
        className={cn(btn, "hover:bg-red-50 hover:text-red-600")}
        title="Supprimer cet échange"
        aria-label="Supprimer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
