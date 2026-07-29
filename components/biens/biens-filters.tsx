"use client";

import { useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

import {
  ESTIMATION_REASON_LABELS,
  PIPELINE_ORDER,
  STAGE_LABELS,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

// Clés de filtres avancés (hors recherche texte) pour compter les filtres actifs
const FILTER_KEYS = [
  "stage",
  "ville",
  "raison",
  "copro",
  "tracfin",
  "prixMin",
  "prixMax",
  "surfaceMin",
  "surfaceMax",
  "chambresMin",
];

export function BiensFilters({ villes }: { villes: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCount = FILTER_KEYS.filter((k) => searchParams.get(k)).length;
  const [open, setOpen] = useState(activeCount > 0);

  function apply() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const params = new URLSearchParams();
    fd.forEach((v, k) => {
      const val = String(v).trim();
      if (val) params.set(k, val);
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function onChange() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(apply, 300);
  }

  function reset() {
    formRef.current
      ?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")
      .forEach((el) => {
        el.value = "";
      });
    router.replace(pathname, { scroll: false });
  }

  const get = (k: string) => searchParams.get(k) ?? "";

  return (
    <form ref={formRef} onChange={onChange} className="mb-6 space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={get("q")}
            placeholder="Rechercher un bien (intitulé, référence, adresse, ville)…"
            className="pl-9"
          />
        </div>
        <NativeSelect
          name="sort"
          defaultValue={get("sort")}
          className="w-auto"
          aria-label="Trier par"
        >
          <option value="">Plus récents</option>
          <option value="prix_desc">Prix décroissant</option>
          <option value="prix_asc">Prix croissant</option>
          <option value="surface_desc">Surface décroissante</option>
          <option value="surface_asc">Surface croissante</option>
          <option value="stage">Étape du pipeline</option>
          <option value="decouverte">Date de découverte</option>
        </NativeSelect>
        <Button
          type="button"
          variant={open ? "secondary" : "outline"}
          onClick={() => setOpen((o) => !o)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtres
          {activeCount > 0 && (
            <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      <div
        className={cn(
          "grid gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4",
          open ? "block" : "hidden"
        )}
      >
        <div className="space-y-1.5">
          <Label className="text-xs">Étape</Label>
          <NativeSelect name="stage" defaultValue={get("stage")}>
            <option value="">Toutes</option>
            {PIPELINE_ORDER.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Ville</Label>
          <NativeSelect name="ville" defaultValue={get("ville")}>
            <option value="">Toutes</option>
            {villes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Raison d&apos;estimation</Label>
          <NativeSelect name="raison" defaultValue={get("raison")}>
            <option value="">Toutes</option>
            {Object.entries(ESTIMATION_REASON_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Copropriété</Label>
          <NativeSelect name="copro" defaultValue={get("copro")}>
            <option value="">Toutes</option>
            <option value="oui">Oui</option>
            <option value="non">Non</option>
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Dossier TRACFIN</Label>
          <NativeSelect name="tracfin" defaultValue={get("tracfin")}>
            <option value="">Tous</option>
            <option value="conforme">Conforme</option>
            <option value="incomplet">Incomplet</option>
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Prix (€)</Label>
          <div className="flex items-center gap-2">
            <Input
              name="prixMin"
              type="number"
              placeholder="min"
              defaultValue={get("prixMin")}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              name="prixMax"
              type="number"
              placeholder="max"
              defaultValue={get("prixMax")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Surface (m²)</Label>
          <div className="flex items-center gap-2">
            <Input
              name="surfaceMin"
              type="number"
              placeholder="min"
              defaultValue={get("surfaceMin")}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              name="surfaceMax"
              type="number"
              placeholder="max"
              defaultValue={get("surfaceMax")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Chambres (min)</Label>
          <Input
            name="chambresMin"
            type="number"
            placeholder="ex : 3"
            defaultValue={get("chambresMin")}
          />
        </div>

        <div className="flex items-end sm:col-span-2 lg:col-span-4">
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            <X className="h-4 w-4" /> Réinitialiser les filtres
          </Button>
        </div>
      </div>
    </form>
  );
}
