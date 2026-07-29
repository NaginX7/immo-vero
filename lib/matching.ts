// Rapprochement entre un bien et les critères de recherche des acquéreurs.
// Fonctions pures : réutilisables côté serveur comme client.

export type BienCriteres = {
  titre: string;
  ville: string | null;
  prix: number | null; // prix effectif (mandat sinon estimation)
  surface: number | null;
  nbPieces: number | null;
  nbChambres: number | null;
  typeConstruction: string | null;
};

export type RechercheCriteres = {
  id: string;
  titre: string | null;
  typeBien: string | null;
  secteur: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  surfaceMin: number | null;
  nbChambresMin: number | null;
};

export type CritereResultat = {
  label: string;
  /** true = respecté, false = non respecté, null = non évaluable */
  ok: boolean | null;
  detail: string;
};

export type Correspondance = {
  criteres: CritereResultat[];
  /** Nombre de critères réellement évalués */
  evalues: number;
  /** Nombre de critères respectés */
  respectes: number;
  /** Critères non respectés */
  manques: string[];
  /** Aucun critère non respecté (et au moins un critère évalué) */
  compatible: boolean;
};

/** Normalise pour comparer : sans accents, minuscules. */
function norm(s: string): string {
  // On décompose puis on retire les diacritiques combinants (U+0300 à U+036F)
  // en filtrant par code de caractère : aucun échappement fragile en source.
  let out = "";
  for (const ch of s.normalize("NFD")) {
    const code = ch.charCodeAt(0);
    if (code >= 0x300 && code <= 0x36f) continue;
    out += ch;
  }
  return out.toLowerCase().trim();
}

function euro(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Évalue la compatibilité d'un bien avec une recherche. */
export function evaluerCorrespondance(
  bien: BienCriteres,
  r: RechercheCriteres
): Correspondance {
  const criteres: CritereResultat[] = [];

  // --- Budget -------------------------------------------------------------
  if ((r.budgetMin != null || r.budgetMax != null) && bien.prix != null) {
    const okMin = r.budgetMin == null || bien.prix >= r.budgetMin;
    const okMax = r.budgetMax == null || bien.prix <= r.budgetMax;
    const bornes = [
      r.budgetMin != null ? `min ${euro(r.budgetMin)}` : null,
      r.budgetMax != null ? `max ${euro(r.budgetMax)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    criteres.push({
      label: "Budget",
      ok: okMin && okMax,
      detail: `${euro(bien.prix)} (${bornes})`,
    });
  } else {
    criteres.push({ label: "Budget", ok: null, detail: "non renseigné" });
  }

  // --- Surface ------------------------------------------------------------
  if (r.surfaceMin != null && bien.surface != null) {
    criteres.push({
      label: "Surface",
      ok: bien.surface >= r.surfaceMin,
      detail: `${bien.surface} m² (min ${r.surfaceMin} m²)`,
    });
  } else {
    criteres.push({ label: "Surface", ok: null, detail: "non renseigné" });
  }

  // --- Chambres -----------------------------------------------------------
  if (r.nbChambresMin != null && bien.nbChambres != null) {
    criteres.push({
      label: "Chambres",
      ok: bien.nbChambres >= r.nbChambresMin,
      detail: `${bien.nbChambres} (min ${r.nbChambresMin})`,
    });
  } else {
    criteres.push({ label: "Chambres", ok: null, detail: "non renseigné" });
  }

  // --- Secteur ------------------------------------------------------------
  if (r.secteur && r.secteur.trim() !== "" && bien.ville) {
    const secteurs = norm(r.secteur);
    const ville = norm(bien.ville);
    criteres.push({
      label: "Secteur",
      ok: ville !== "" && secteurs.includes(ville),
      detail: `${bien.ville} (recherche : ${r.secteur})`,
    });
  } else {
    criteres.push({ label: "Secteur", ok: null, detail: "non renseigné" });
  }

  // --- Type de bien -------------------------------------------------------
  if (r.typeBien && r.typeBien.trim() !== "") {
    const cible = norm(`${bien.titre} ${bien.typeConstruction ?? ""}`);
    // On retient les mots significatifs du type recherché (maison, appartement…)
    const mots = norm(r.typeBien)
      .split(/[^a-z0-9]+/)
      .filter((m) => m.length >= 5);
    criteres.push({
      label: "Type de bien",
      ok: mots.length === 0 ? null : mots.some((m) => cible.includes(m)),
      detail: `recherche : ${r.typeBien}`,
    });
  } else {
    criteres.push({ label: "Type de bien", ok: null, detail: "non renseigné" });
  }

  const evalues = criteres.filter((c) => c.ok !== null).length;
  const respectes = criteres.filter((c) => c.ok === true).length;
  const manques = criteres.filter((c) => c.ok === false).map((c) => c.label);

  return {
    criteres,
    evalues,
    respectes,
    manques,
    compatible: evalues > 0 && manques.length === 0,
  };
}
