import type { MetadataRoute } from "next";

/**
 * robots.txt — outil de gestion interne : rien ne doit être exploré ni indexé.
 *
 * Empêche aussi les robots de consommer inutilement la base de données en
 * parcourant les fiches, et évite l'indexation des liens de confirmation de
 * rendez-vous (/rdv/confirmation?token=…).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
