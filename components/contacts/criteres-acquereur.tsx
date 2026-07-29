"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import {
  MODE_FINANCEMENT_LABELS,
  TYPES_BIEN_RECHERCHE,
} from "@/lib/labels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";

const PRESTATIONS = [
  { name: "garage", label: "Garage" },
  { name: "sousSol", label: "Sous-sol" },
  { name: "dependance", label: "Dépendance" },
  { name: "piscine", label: "Piscine" },
];

/**
 * Critères de recherche d'un acquéreur, saisis dès la création de la fiche.
 * Les champs portent le préfixe `r_` pour être distingués de ceux du contact
 * dans le même formulaire.
 */
export function CriteresAcquereur({
  avecEntete = true,
}: {
  /** Masqué lorsque le contexte l'annonce déjà (ex. « Nouvelle fiche recherche »). */
  avecEntete?: boolean;
} = {}) {
  const [avecTerrain, setAvecTerrain] = useState(false);

  return (
    <div className="space-y-4 rounded-lg border border-powder-200 bg-powder-50/40 p-4">
      {avecEntete && (
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-coral-500" />
          <h4 className="text-sm font-semibold text-navy-800">Sa recherche</h4>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Type de bien</Label>
          <NativeSelect name="r_typeBien" defaultValue="">
            <option value="">Indifférent</option>
            {TYPES_BIEN_RECHERCHE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Secteur (villes)</Label>
          <Input name="r_secteur" placeholder="Saverne, Monswiller…" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Pièces (min)</Label>
          <Input name="r_nbPiecesMin" type="number" min={0} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Chambres (min)</Label>
          <Input name="r_nbChambresMin" type="number" min={0} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Budget min (€)</Label>
          <Input name="r_budgetMin" type="number" min={0} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Budget max (€)</Label>
          <Input name="r_budgetMax" type="number" min={0} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Surface habitable (min, m²)</Label>
        <Input name="r_surfaceMin" type="number" min={0} className="sm:w-40" />
      </div>

      {/* Terrain : la surface n'apparaît que si le terrain est souhaité */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            name="r_avecTerrain"
            checked={avecTerrain}
            onCheckedChange={(v) => setAvecTerrain(v === true)}
          />
          Terrain
        </label>
        {avecTerrain && (
          <div className="ml-7 space-y-1.5">
            <Label className="text-xs">Surface de terrain (min, m²)</Label>
            <Input
              name="r_surfaceTerrainMin"
              type="number"
              min={0}
              className="sm:w-40"
              autoFocus
            />
          </div>
        )}
      </div>

      <div>
        <Label className="text-xs">Prestations souhaitées</Label>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {PRESTATIONS.map((p) => (
            <label key={p.name} className="flex items-center gap-2 text-sm">
              <Checkbox name={`r_${p.name}`} />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs">Mode de financement</Label>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {Object.entries(MODE_FINANCEMENT_LABELS).map(([valeur, libelle]) => (
            <label key={valeur} className="flex items-center gap-2 text-sm">
              <Checkbox name="r_modesFinancement" value={valeur} />
              {libelle}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Historique de recherche</Label>
        <Textarea
          name="r_historique"
          rows={2}
          placeholder="Biens déjà visités, secteurs écartés, refus…"
        />
      </div>
    </div>
  );
}
