# Giorgio Immo — CRM · L'Immobilière de Saverne

CRM métier sur-mesure (v0, démo locale) pour Véronique Noureddine, mandataire
immobilière indépendante (réseau BSK, Saverne).

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Prisma** + **Neon** (Postgres serverless)
- **Tailwind CSS** + composants façon **shadcn/ui**
- Drag & drop : `@hello-pangea/dnd`
- Charte : navy / corail / rose poudré

## Modules

- **Tableau de bord** — biens par étape, prochains RDV, alertes documents (dont TRACFIN), dernières activités
- **Pipeline** — Kanban 10 colonnes, cartes déplaçables (drag & drop)
- **Biens** — fiche complète, surfaces par pièce, checklist documentaire reçu/manquant, vigilance TRACFIN
- **Contacts** — fiche 2 zones (infos + onglets Événements / Échanges / Biens & Recherches), pièces TRACFIN
- **Partenaires** — coordonnées, spécialité, compteur d'affaires
- **Templates** — SMS/emails par catégorie, variables, bouton copier (envoi Brevo prévu en v1)

## Démarrage

1. **Connexion Neon** — coller la connection string dans `.env` :

   ```
   DATABASE_URL="postgresql://…@…neon.tech/neondb?sslmode=require"
   ```

2. **Créer les tables + données de démo** :

   ```bash
   npm run db:push     # crée le schéma dans Neon
   npm run db:seed     # insère les données de démonstration
   ```

3. **Lancer** :

   ```bash
   npm run dev
   ```

   → http://localhost:3000

## Scripts utiles

| Script              | Rôle                                    |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Serveur de développement                |
| `npm run db:push`   | Synchronise le schéma Prisma vers Neon  |
| `npm run db:seed`   | (Ré)insère les données de démonstration |
| `npm run db:studio` | Prisma Studio (explorer la base)        |
| `npm run build`     | Build de production                     |

## Notes v0

- Utilisateur unique, pas d'authentification (à ajouter en v1 si besoin).
- **Emails : envoi réel via Resend** (renseigner `RESEND_API_KEY` dans `.env`).
  Envoi depuis la page Templates (bouton « Envoyer ») ou la fiche contact ;
  chaque envoi est journalisé en `Echange` (`statutEnvoi`, `templateId`).
  Mode test Resend (`onboarding@resend.dev`) = envoi limité à votre propre
  adresse Resend ; pour envoyer à n'importe qui, vérifier un domaine et adapter
  `RESEND_FROM`. Les **SMS** restent en copier-coller.
- La logique conditionnelle fine du pipeline n'est pas figée dans le code :
  le déplacement entre étapes est manuel (Kanban), conformément au brief v0.
