"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type AdresseChoisie = {
  label: string;
  ville: string;
  codePostal: string;
};

type Suggestion = AdresseChoisie & { id: string; contexte: string };

/**
 * Champ d'adresse avec suggestions issues de la Base Adresse Nationale
 * (api-adresse.data.gouv.fr) : API publique de l'État, sans clé, qui renvoie
 * des adresses postales réelles et normalisées.
 *
 * La saisie libre reste possible : si l'adresse n'est pas trouvée (bien neuf,
 * lieu-dit…), le texte saisi est conservé tel quel.
 */
export function AddressInput({
  value,
  onChange,
  placeholder = "12 rue des Roses, Saverne",
  id,
}: {
  value: AdresseChoisie | null;
  onChange: (v: AdresseChoisie | null) => void;
  placeholder?: string;
  id?: string;
}) {
  const [texte, setTexte] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [indexActif, setIndexActif] = useState(-1);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conteneur = useRef<HTMLDivElement>(null);
  const requeteEnCours = useRef(0);

  // Ferme la liste au clic à l'extérieur
  useEffect(() => {
    function auClic(e: MouseEvent) {
      if (!conteneur.current?.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", auClic);
    return () => document.removeEventListener("mousedown", auClic);
  }, []);

  function rechercher(q: string) {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 4) {
      setSuggestions([]);
      setOuvert(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const idRequete = ++requeteEnCours.current;
      setChargement(true);
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
            q
          )}&limit=5&autocomplete=1`
        );
        if (!res.ok) throw new Error("réponse invalide");
        const data = await res.json();
        // Une réponse arrivée en retard ne doit pas écraser une plus récente
        if (idRequete !== requeteEnCours.current) return;

        const items: Suggestion[] = (data.features ?? []).map(
          (f: {
            properties: {
              id: string;
              label: string;
              city?: string;
              postcode?: string;
              context?: string;
            };
          }) => ({
            id: f.properties.id,
            label: f.properties.label,
            ville: f.properties.city ?? "",
            codePostal: f.properties.postcode ?? "",
            contexte: f.properties.context ?? "",
          })
        );
        setSuggestions(items);
        setOuvert(items.length > 0);
        setIndexActif(-1);
      } catch {
        // Service indisponible : on laisse la saisie libre, sans bloquer.
        setSuggestions([]);
        setOuvert(false);
      } finally {
        if (idRequete === requeteEnCours.current) setChargement(false);
      }
    }, 250);
  }

  function choisir(s: Suggestion) {
    setTexte(s.label);
    onChange({ label: s.label, ville: s.ville, codePostal: s.codePostal });
    setOuvert(false);
    setSuggestions([]);
  }

  function auClavier(e: React.KeyboardEvent) {
    if (!ouvert || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndexActif((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndexActif((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && indexActif >= 0) {
      e.preventDefault();
      choisir(suggestions[indexActif]);
    } else if (e.key === "Escape") {
      setOuvert(false);
    }
  }

  const valide = value !== null && value.label === texte;

  return (
    <div ref={conteneur} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={texte}
          autoComplete="off"
          placeholder={placeholder}
          className="pl-9 pr-9"
          onChange={(e) => {
            const v = e.target.value;
            setTexte(v);
            // La saisie libre reste exploitable même sans sélection
            onChange(v.trim() === "" ? null : { label: v, ville: "", codePostal: "" });
            rechercher(v);
          }}
          onFocus={() => suggestions.length > 0 && setOuvert(true)}
          onKeyDown={auClavier}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {chargement ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : valide && value.codePostal !== "" ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : null}
        </span>
      </div>

      {ouvert && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseEnter={() => setIndexActif(i)}
                onClick={() => choisir(s)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors",
                  i === indexActif ? "bg-muted" : "hover:bg-muted"
                )}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral-500" />
                <span>
                  <span className="block">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.contexte}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
