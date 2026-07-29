"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  FileSignature,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  UserPlus,
} from "lucide-react";

import { enregistrerCompromisNotaires } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type NotaireLite = {
  id: string;
  nom: string;
  societe: string | null;
  telephone: string | null;
  email: string | null;
};

/**
 * S'ouvre quand un bien bascule en « Compromis » : on désigne le ou les
 * notaires à appeler. Le compromis est alors inscrit dans leurs affaires.
 */
export function CompromisDialog({
  open,
  onOpenChange,
  bienId,
  bienTitre,
  notaires,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bienId: string;
  bienTitre: string;
  notaires: NotaireLite[];
}) {
  const [selection, setSelection] = useState<string[]>([]);
  const [erreur, setErreur] = useState("");
  const [toast, setToast] = useState("");
  const [pending, start] = useTransition();

  function basculer(id: string) {
    setSelection((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
  }

  function fermer(v: boolean) {
    if (!v) {
      setSelection([]);
      setErreur("");
    }
    onOpenChange(v);
  }

  function enregistrer() {
    setErreur("");
    start(async () => {
      const res = await enregistrerCompromisNotaires(bienId, selection);
      if (res.ok) {
        setToast(
          res.crees && res.crees > 1
            ? `Compromis enregistré chez ${res.crees} notaires`
            : "Compromis enregistré chez le notaire"
        );
        fermer(false);
      } else {
        setErreur(res.error ?? "Enregistrement impossible.");
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={fermer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-coral-500" />
              Compromis — quel notaire ?
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-navy-800">{bienTitre}</span> passe
            en compromis. Sélectionnez le ou les notaires à appeler : l&apos;affaire
            sera inscrite dans leur fiche.
          </p>

          {notaires.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="font-medium text-navy-800">
                Aucun notaire enregistré
              </p>
              <p className="mt-1 text-muted-foreground">
                Ajoutez d&apos;abord un notaire à vos partenaires, puis
                repassez le bien en compromis.
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/partenaires">
                  <UserPlus className="h-4 w-4" /> Aller aux partenaires
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {notaires.map((n) => {
                const coche = selection.includes(n.id);
                return (
                  <li key={n.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                        coche
                          ? "border-coral-300 bg-powder-50"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <Checkbox
                        checked={coche}
                        onCheckedChange={() => basculer(n.id)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-navy-800">
                          {n.nom}
                        </span>
                        {n.societe && (
                          <span className="block text-xs text-muted-foreground">
                            {n.societe}
                          </span>
                        )}
                        <span className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {n.telephone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {n.telephone}
                            </span>
                          )}
                          {n.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 shrink-0" /> {n.email}
                            </span>
                          )}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {erreur && (
            <p className="flex items-start gap-1.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {erreur}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => fermer(false)}>
              Plus tard
            </Button>
            {notaires.length > 0 && (
              <Button
                onClick={enregistrer}
                disabled={pending || selection.length === 0}
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
                {selection.length > 1 ? ` (${selection.length})` : ""}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toast show={!!toast} message={toast} onDone={() => setToast("")} />
    </>
  );
}
