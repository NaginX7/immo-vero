import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { COOKIE_NAME, signingSecret, verifySessionValue } from "@/lib/auth";

/**
 * Garde d'accès pour les pages et actions de l'espace de gestion.
 *
 * Volontairement exécutée dans le runtime Node (et non dans un middleware Edge) :
 * l'Edge Runtime de Vercel ne supporte pas le code généré pour les server
 * actions, ce qui provoquait un plantage au démarrage du middleware.
 *
 * À appeler en première ligne de chaque page et de chaque action réservées.
 */
export async function requireAuth(): Promise<void> {
  // Aucun mot de passe défini :
  //  - en développement local → accès direct (confort)
  //  - en production → accès BLOQUÉ, on n'expose jamais les données par défaut
  if ((process.env.APP_PASSWORD ?? "") === "" && process.env.NODE_ENV === "production") {
    redirect("/login?config=manquante");
  }
  if (!(await isAuthenticated())) redirect("/login");
}

/**
 * Même contrôle que `requireAuth`, sans redirection : pour les routes d'API,
 * qui doivent répondre 401 plutôt que renvoyer vers la page de connexion.
 */
export async function isAuthenticated(): Promise<boolean> {
  if ((process.env.APP_PASSWORD ?? "") === "") {
    return process.env.NODE_ENV !== "production";
  }
  return verifySessionValue(cookies().get(COOKIE_NAME)?.value, signingSecret());
}
