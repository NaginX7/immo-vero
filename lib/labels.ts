// Libellés français + métadonnées d'affichage pour les enums du schéma.
// Source unique de vérité partagée entre le seed et l'UI.

import type {
  PipelineStage,
  ContactRole,
  EstimationReason,
  PartenaireType,
  EventType,
  ExchangeType,
  DocType,
  DocStatus,
  TemplateCategory,
  TemplateChannel,
  ModeFinancement,
} from "@prisma/client";

// --- Pipeline -------------------------------------------------------------

/** Ordre des colonnes du Kanban (process réel de Véronique). */
export const PIPELINE_ORDER: PipelineStage[] = [
  "PROSPECTION",
  "R1_DECOUVERTE",
  "BACK_OFFICE",
  "R2_ESTIMATION",
  "MANDAT_SIGNE",
  "COMMERCIALISATION",
  "VISITE_PLANIFIEE",
  "OFFRE_EN_COURS",
  "COMPROMIS",
  "VENTE_DEFINITIVE",
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  PROSPECTION: "Prospection",
  R1_DECOUVERTE: "R1 Découverte",
  BACK_OFFICE: "Back-office",
  R2_ESTIMATION: "R2 Estimation",
  MANDAT_SIGNE: "Mandat signé",
  COMMERCIALISATION: "Commercialisation",
  VISITE_PLANIFIEE: "Visite planifiée",
  OFFRE_EN_COURS: "Offre en cours",
  COMPROMIS: "Compromis",
  VENTE_DEFINITIVE: "Vente définitive",
};

/** Couleur d'accent par étape (utilisée sur les cartes / badges). */
export const STAGE_COLORS: Record<PipelineStage, string> = {
  PROSPECTION: "bg-slate-100 text-slate-700 border-slate-200",
  R1_DECOUVERTE: "bg-sky-100 text-sky-700 border-sky-200",
  BACK_OFFICE: "bg-indigo-100 text-indigo-700 border-indigo-200",
  R2_ESTIMATION: "bg-violet-100 text-violet-700 border-violet-200",
  MANDAT_SIGNE: "bg-powder-100 text-coral-600 border-powder-200",
  COMMERCIALISATION: "bg-amber-100 text-amber-700 border-amber-200",
  VISITE_PLANIFIEE: "bg-cyan-100 text-cyan-700 border-cyan-200",
  OFFRE_EN_COURS: "bg-orange-100 text-orange-700 border-orange-200",
  COMPROMIS: "bg-teal-100 text-teal-700 border-teal-200",
  VENTE_DEFINITIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

// --- Contacts -------------------------------------------------------------

export const ROLE_LABELS: Record<ContactRole, string> = {
  VENDEUR: "Vendeur",
  ACQUEREUR: "Acquéreur",
  APPORTEUR: "Apporteur d'affaire",
};

export const ROLE_BADGE: Record<ContactRole, string> = {
  VENDEUR: "bg-navy-100 text-navy-700",
  ACQUEREUR: "bg-sky-100 text-sky-700",
  APPORTEUR: "bg-powder-100 text-coral-600",
};

export const MODE_FINANCEMENT_LABELS: Record<ModeFinancement, string> = {
  PRET: "Prêt bancaire",
  APPORT: "Apport personnel",
  DONATION: "Donation",
  VENTE_BIEN: "Vente d'un bien (à venir ou en cours)",
};

/** Types de bien proposés à un acquéreur. */
export const TYPES_BIEN_RECHERCHE = ["Maison", "Appartement"] as const;

export const ESTIMATION_REASON_LABELS: Record<EstimationReason, string> = {
  VENTE: "Vente",
  SUCCESSION: "Succession",
  DIVORCE: "Divorce",
  MUTATION: "Mutation professionnelle",
  INVESTISSEMENT: "Investissement",
  AUTRE: "Autre",
};

export const PARTENAIRE_TYPE_LABELS: Record<PartenaireType, string> = {
  DIAGNOSTIQUEUR: "Diagnostiqueur",
  NOTAIRE: "Notaire",
  COURTIER: "Courtier",
  ARTISAN: "Artisan",
  GEOMETRE: "Géomètre",
  BANQUE: "Banque",
  AUTRE: "Autre",
};

// --- Événements / Échanges -----------------------------------------------

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  RDV: "Rendez-vous",
  VISITE: "Visite",
  ESTIMATION: "Estimation",
  OFFRE: "Offre d'achat",
  MANDAT: "Mandat",
  COMPROMIS: "Compromis",
  SIGNATURE: "Signature",
  APPORT_AFFAIRE: "Apport d'affaire",
  RECOMMANDATION: "Recommandation",
  AUTRE: "Autre",
};

/** Types d'entrées autorisés dans le bloc « Affaires » d'un partenaire. */
export const PARTENAIRE_EVENT_TYPES: EventType[] = [
  "APPORT_AFFAIRE",
  "RECOMMANDATION",
];

export const EXCHANGE_TYPE_LABELS: Record<ExchangeType, string> = {
  EMAIL: "Email",
  SMS: "SMS",
  APPEL: "Appel",
  NOTE: "Note interne",
};

// --- Documents ------------------------------------------------------------

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  PEC_VENDEUR: "PEC vendeur",
  TITRE_PROPRIETE: "Titre de propriété",
  TAXE_FONCIERE: "Taxe foncière",
  DIAG_IMMO: "Diagnostics immobiliers",
  SDEA: "SDEA (eau/assainissement)",
  FACTURES_TRAVAUX: "Factures de travaux",
  PERMIS_CONSTRUIRE: "Permis de construire",
  DP: "Déclaration préalable (DP)",
  DACT: "Achèvement travaux (DACT)",
  LISTE_MOBILIER: "Liste du mobilier",
  ORIGINE_FONDS: "Origine des fonds",
  MODE_FINANCEMENT: "Mode de financement",
  PV_AG: "PV d'assemblée générale",
  APPELS_FONDS: "Appels de fonds",
  REGLEMENT_COPRO: "Règlement de copropriété",
  DIAGS_COPRO: "Diagnostics copropriété",
  PIECE_IDENTITE: "Pièce d'identité",
  JUSTIF_DOMICILE: "Justificatif de domicile",
  AUTRE: "Autre document",
};

/** Checklist documentaire standard d'un bien (hors copropriété). */
export const BIEN_DOC_CHECKLIST: DocType[] = [
  "PEC_VENDEUR",
  "TITRE_PROPRIETE",
  "TAXE_FONCIERE",
  "DIAG_IMMO",
  "SDEA",
  "FACTURES_TRAVAUX",
  "PERMIS_CONSTRUIRE",
  "DP",
  "DACT",
  "LISTE_MOBILIER",
  "MODE_FINANCEMENT",
];

/** Documents supplémentaires si le bien est en copropriété. */
export const COPRO_DOC_CHECKLIST: DocType[] = [
  "PV_AG",
  "APPELS_FONDS",
  "REGLEMENT_COPRO",
  "DIAGS_COPRO",
];

/** Pièces obligatoires au sens vigilance TRACFIN. */
export const TRACFIN_DOC_TYPES: DocType[] = [
  // Côté vendeur (fiche bien)
  "TITRE_PROPRIETE",
  "TAXE_FONCIERE",
  "MODE_FINANCEMENT",
  // Côté personne (fiche contact) — l'origine des fonds concerne l'acquéreur
  "PIECE_IDENTITE",
  "ORIGINE_FONDS",
];

/**
 * Ordre d'affichage fixe de la checklist documentaire d'un bien : les pièces
 * TRACFIN d'abord, puis le reste dans un ordre stable. Indépendant de l'ordre
 * de création en base, pour que la liste ne bouge pas quand on change un statut.
 */
export const BIEN_DOC_ORDER: DocType[] = [
  ...TRACFIN_DOC_TYPES.filter(
    (t) => BIEN_DOC_CHECKLIST.includes(t) || COPRO_DOC_CHECKLIST.includes(t)
  ),
  ...BIEN_DOC_CHECKLIST.filter((t) => !TRACFIN_DOC_TYPES.includes(t)),
  ...COPRO_DOC_CHECKLIST.filter((t) => !TRACFIN_DOC_TYPES.includes(t)),
];

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  MANQUANT: "Manquant",
  RECU: "Reçu",
  NON_APPLICABLE: "Non applicable",
};

// --- Templates ------------------------------------------------------------

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  RELANCE_VENDEUR: "Relance vendeur",
  RELANCE_ACQUEREUR: "Relance acquéreur",
  RESEAU_APPORTEURS: "Réseau apporteurs",
  CR_POST_VISITE: "Compte-rendu post-visite",
  RAPPEL_RDV_VEILLE: "Rappel RDV (veille)",
  AUTRE: "Autre",
};

export const TEMPLATE_CHANNEL_LABELS: Record<TemplateChannel, string> = {
  SMS: "SMS",
  EMAIL: "Email",
};
