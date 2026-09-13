"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Pencil, Loader2, Trash2 } from "lucide-react";
import type { Template } from "@prisma/client";

import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/actions";
import { TEMPLATE_CATEGORY_LABELS } from "@/lib/labels";
import { TEMPLATE_VAR_GROUPS } from "@/lib/template-vars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Insère `text` dans un champ à la position du curseur, retourne la nouvelle valeur. */
function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement,
  current: string,
  text: string
): { value: string; cursor: number } {
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const value = current.slice(0, start) + text + current.slice(end);
  return { value, cursor: start + text.length };
}

export function TemplateEditorDialog({
  template,
}: {
  template?: Template;
}) {
  const isEdit = !!template;
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [nom, setNom] = useState(template?.nom ?? "");
  const [categorie, setCategorie] = useState(
    template?.categorie ?? "AUTRE"
  );
  const [tutoiement, setTutoiement] = useState(
    template?.tutoiement ?? false
  );
  const [objet, setObjet] = useState(template?.objet ?? "");
  const [corps, setCorps] = useState(template?.corps ?? "");

  const objetRef = useRef<HTMLInputElement>(null);
  const corpsRef = useRef<HTMLTextAreaElement>(null);
  const activeField = useRef<"objet" | "corps">("corps");

  function insertVar(name: string) {
    const token = `{${name}}`;
    if (activeField.current === "objet" && objetRef.current) {
      const { value, cursor } = insertAtCursor(objetRef.current, objet, token);
      setObjet(value);
      requestAnimationFrame(() => {
        objetRef.current?.focus();
        objetRef.current?.setSelectionRange(cursor, cursor);
      });
    } else if (corpsRef.current) {
      const { value, cursor } = insertAtCursor(corpsRef.current, corps, token);
      setCorps(value);
      requestAnimationFrame(() => {
        corpsRef.current?.focus();
        corpsRef.current?.setSelectionRange(cursor, cursor);
      });
    }
  }

  function resetToTemplate() {
    setNom(template?.nom ?? "");
    setCategorie(template?.categorie ?? "AUTRE");
    setTutoiement(template?.tutoiement ?? false);
    setObjet(template?.objet ?? "");
    setCorps(template?.corps ?? "");
  }

  const action = isEdit
    ? (fd: FormData) =>
        start(async () => {
          await updateTemplate(template!.id, fd);
          setOpen(false);
        })
    : (fd: FormData) =>
        start(async () => {
          await createTemplate(fd);
          setOpen(false);
          resetToTemplate();
        });

  function handleDelete() {
    if (!template) return;
    if (!confirm(`Supprimer le template « ${template.nom} » ?`)) return;
    start(async () => {
      await deleteTemplate(template.id);
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && !isEdit) resetToTemplate();
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="sm" variant="outline">
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
        ) : (
          <Button variant="accent">
            <Plus className="h-4 w-4" /> Nouveau template email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le template" : "Nouveau template email"}
          </DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Titre *</Label>
              <Input
                name="nom"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Catégorie</Label>
              <NativeSelect
                name="categorie"
                value={categorie}
                onChange={(e) =>
                  setCategorie(e.target.value as typeof categorie)
                }
              >
                {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              name="tutoiement"
              checked={tutoiement}
              onCheckedChange={(v) => setTutoiement(v === true)}
            />
            Tutoiement (réseau d&apos;apporteurs)
          </label>

          <div className="rounded-lg border border-powder-200 bg-powder-50/50 p-3">
            <Label className="text-xs font-semibold text-navy-700">
              Insérer une variable
            </Label>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Clic pour insérer dans le champ actif (objet ou message). Les
              variables reconnues se remplissent automatiquement à l&apos;envoi
              (contact / bien / rendez-vous liés) ; toute autre variable{" "}
              <code>{"{ma_variable}"}</code> reste à compléter manuellement.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TEMPLATE_VAR_GROUPS.map((group) =>
                group.vars.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVar(v)}
                    className="rounded bg-powder-100 px-1.5 py-0.5 text-xs font-medium text-coral-600 transition hover:bg-powder-200"
                    title={group.label}
                  >
                    {`{${v}}`}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Objet (email)</Label>
            <Input
              ref={objetRef}
              name="objet"
              value={objet}
              onFocus={() => (activeField.current = "objet")}
              onChange={(e) => setObjet(e.target.value)}
              placeholder="Ex : Offre reçue pour {adresse_bien}"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Message *</Label>
            <Textarea
              ref={corpsRef}
              name="corps"
              required
              rows={10}
              value={corps}
              onFocus={() => (activeField.current = "corps")}
              onChange={(e) => setCorps(e.target.value)}
              className="font-sans"
            />
          </div>

          <DialogFooter className="sm:justify-between">
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer le template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
