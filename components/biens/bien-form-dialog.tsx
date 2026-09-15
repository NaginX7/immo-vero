"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Loader2 } from "lucide-react";
import type { Bien } from "@prisma/client";

import { createBien, updateBien } from "@/lib/actions";
import {
  ESTIMATION_REASON_LABELS,
  PIPELINE_ORDER,
  STAGE_LABELS,
} from "@/lib/labels";
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

function triState(v: boolean | null | undefined): string {
  return v === true ? "true" : v === false ? "false" : "";
}
function dateVal(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

const OUI_NON = (
  <>
    <option value="">—</option>
    <option value="true">Oui</option>
    <option value="false">Non</option>
  </>
);

export function BienFormDialog({ bien }: { bien?: Bien }) {
  const isEdit = !!bien;
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const action = isEdit
    ? (fd: FormData) =>
        start(async () => {
          await updateBien(bien!.id, fd);
          setOpen(false);
        })
    : (fd: FormData) => start(() => createBien(fd)); // redirige vers la fiche

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
        ) : (
          <Button variant="accent">
            <Plus className="h-4 w-4" /> Nouveau bien
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le bien" : "Nouveau bien"}</DialogTitle>
        </DialogHeader>

        <form action={action} className="space-y-5">
          <Section title="Identité">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Intitulé *">
                <Input
                  name="titre"
                  required
                  defaultValue={bien?.titre}
                  placeholder="Maison 5 pièces — rue…"
                />
              </Field>
              <Field label="Référence">
                <Input
                  name="reference"
                  defaultValue={bien?.reference ?? ""}
                  placeholder="SAV-2026-000"
                />
              </Field>
              {!isEdit && (
                <Field label="Étape">
                  <NativeSelect name="stage" defaultValue="PROSPECTION">
                    {PIPELINE_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              )}
            </div>
          </Section>

          <Section title="Localisation">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Field label="Adresse">
                  <Input name="adresse" defaultValue={bien?.adresse ?? ""} />
                </Field>
              </div>
              <Field label="Code postal">
                <Input name="codePostal" defaultValue={bien?.codePostal ?? ""} />
              </Field>
              <Field label="Ville">
                <Input name="ville" defaultValue={bien?.ville ?? ""} />
              </Field>
            </div>
          </Section>

          <Section title="Dates & prix">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="Date de découverte">
                <Input
                  type="date"
                  name="dateDecouverte"
                  defaultValue={dateVal(bien?.dateDecouverte)}
                />
              </Field>
              <Field label="Date de propriété">
                <Input
                  type="date"
                  name="datePropriete"
                  defaultValue={dateVal(bien?.datePropriete)}
                />
              </Field>
              <Field label="Prix estimé (€)">
                <Input
                  type="number"
                  name="prixEstime"
                  defaultValue={bien?.prixEstime ?? ""}
                />
              </Field>
              <Field label="Prix au mandat (€)">
                <Input
                  type="number"
                  name="prixMandat"
                  defaultValue={bien?.prixMandat ?? ""}
                />
              </Field>
              <Field label="Prix de vente définitif (€)">
                <Input
                  type="number"
                  name="prixVenteDefinitif"
                  defaultValue={bien?.prixVenteDefinitif ?? ""}
                />
              </Field>
            </div>
          </Section>

          <Section title="Caractéristiques">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="Surface (m²)">
                <Input type="number" name="surface" defaultValue={bien?.surface ?? ""} />
              </Field>
              <Field label="Terrain (m²)">
                <Input
                  type="number"
                  name="surfaceTerrain"
                  defaultValue={bien?.surfaceTerrain ?? ""}
                />
              </Field>
              <Field label="Nb pièces">
                <Input type="number" name="nbPieces" defaultValue={bien?.nbPieces ?? ""} />
              </Field>
              <Field label="Nb chambres">
                <Input
                  type="number"
                  name="nbChambres"
                  defaultValue={bien?.nbChambres ?? ""}
                />
              </Field>
              <Field label="Mitoyenneté">
                <Input name="mitoyennete" defaultValue={bien?.mitoyennete ?? ""} />
              </Field>
              <Field label="Plain-pied">
                <NativeSelect name="plainPied" defaultValue={triState(bien?.plainPied)}>
                  {OUI_NON}
                </NativeSelect>
              </Field>
              <Field label="Plans dispo.">
                <NativeSelect name="plans" defaultValue={triState(bien?.plans)}>
                  {OUI_NON}
                </NativeSelect>
              </Field>
              <Field label="Travaux -10 ans">
                <NativeSelect
                  name="travauxMoins10Ans"
                  defaultValue={triState(bien?.travauxMoins10Ans)}
                >
                  {OUI_NON}
                </NativeSelect>
              </Field>
            </div>
          </Section>

          <Section title="Construction & équipements">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Type construction">
                <Input
                  name="typeConstruction"
                  defaultValue={bien?.typeConstruction ?? ""}
                />
              </Field>
              <Field label="Couverture">
                <Input
                  name="typeCouverture"
                  defaultValue={bien?.typeCouverture ?? ""}
                />
              </Field>
              <Field label="Charpente">
                <Input
                  name="typeCharpente"
                  defaultValue={bien?.typeCharpente ?? ""}
                />
              </Field>
              <Field label="Chauffage">
                <Input name="modeChauffage" defaultValue={bien?.modeChauffage ?? ""} />
              </Field>
              <Field label="Eau chaude">
                <Input name="modeEauChaude" defaultValue={bien?.modeEauChaude ?? ""} />
              </Field>
              <Field label="Fenêtres / vitrages">
                <Input name="typeFenetres" defaultValue={bien?.typeFenetres ?? ""} />
              </Field>
            </div>
          </Section>

          <Section title="Estimation">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Raison de l'estimation">
                <NativeSelect
                  name="raisonEstimation"
                  defaultValue={bien?.raisonEstimation ?? ""}
                >
                  <option value="">—</option>
                  {Object.entries(ESTIMATION_REASON_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Profession du propriétaire">
                <Input
                  name="professionProprietaire"
                  defaultValue={bien?.professionProprietaire ?? ""}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Précision estimation">
                  <Input
                    name="raisonEstimationNote"
                    defaultValue={bien?.raisonEstimationNote ?? ""}
                  />
                </Field>
              </div>
            </div>
            <label className="flex items-center gap-2 pt-1 text-sm">
              <Checkbox
                name="copropriete"
                defaultChecked={bien?.copropriete ?? false}
              />
              Bien en copropriété
            </label>
          </Section>

          <Section title="Notes">
            <Field label="Diagnostics (note)">
              <Input
                name="diagnosticsNote"
                defaultValue={bien?.diagnosticsNote ?? ""}
              />
            </Field>
            <Field label="Historique / notes libres">
              <Textarea name="notes" rows={3} defaultValue={bien?.notes ?? ""} />
            </Field>
          </Section>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer le bien"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
