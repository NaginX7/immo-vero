// Variables reconnues dans les templates (email) : elles se pré-remplissent
// automatiquement au moment de l'envoi (contact / bien / rendez-vous liés).
// Toute autre variable {xxx} tapée dans un template reste à remplir manuellement.

export const CONTACT_VARS = ["prénom", "nom", "nom_complet"];
export const BIEN_VARS = ["adresse_bien", "ville_bien", "prix", "nb_visites"];
export const EVENT_VARS = ["date_rdv"];

export const TEMPLATE_VAR_GROUPS: { label: string; vars: string[] }[] = [
  { label: "Contact", vars: CONTACT_VARS },
  { label: "Bien", vars: BIEN_VARS },
  { label: "Rendez-vous", vars: EVENT_VARS },
];
