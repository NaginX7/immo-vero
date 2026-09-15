"use client";

import { useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { ROLE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

const FILTER_KEYS = ["role", "ville", "segment", "aBiens", "aRecherche"];

export function ContactsFilters({
  villes,
  segments,
}: {
  villes: string[];
  segments: { id: string; nom: string }[];
}) {
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
    formRef.current?.reset();
    formRef.current
      ?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select")
      .forEach((el) => {
        if (el instanceof HTMLInputElement && el.type === "checkbox")
          el.checked = false;
        else el.value = "";
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
            placeholder="Rechercher un contact (nom, email, téléphone, profession, ville)…"
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
          <option value="ancien">Plus anciens</option>
          <option value="nom_asc">Nom (A → Z)</option>
          <option value="nom_desc">Nom (Z → A)</option>
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
          open ? "grid" : "hidden"
        )}
      >
        <div className="space-y-1.5">
          <Label className="text-xs">Rôle</Label>
          <NativeSelect name="role" defaultValue={get("role")}>
            <option value="">Tous</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
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
          <Label className="text-xs">Segment</Label>
          <NativeSelect name="segment" defaultValue={get("segment")}>
            <option value="">Tous</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </NativeSelect>
        </div>

        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            name="aBiens"
            defaultChecked={!!get("aBiens")}
            className="h-4 w-4 accent-[hsl(var(--accent))]"
          />
          Propriétaire d&apos;un bien
        </label>

        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            name="aRecherche"
            defaultChecked={!!get("aRecherche")}
            className="h-4 w-4 accent-[hsl(var(--accent))]"
          />
          A une recherche active
        </label>

        <div className="flex items-end sm:col-span-2 lg:col-span-4">
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            <X className="h-4 w-4" /> Réinitialiser les filtres
          </Button>
        </div>
      </div>
    </form>
  );
}
