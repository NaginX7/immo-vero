"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Bouton de suppression générique.
 * `action` est une server action déjà liée à l'id (ex: deleteBien.bind(null, id)).
 */
export function DeleteButton({
  action,
  label = "Supprimer",
  confirmMessage = "Confirmer la suppression ? Cette action est irréversible.",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmMessage?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      className="text-destructive hover:bg-red-50 hover:text-destructive"
      onClick={() => {
        if (window.confirm(confirmMessage)) start(() => action());
      }}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
