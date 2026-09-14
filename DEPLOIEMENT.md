# Déploiement — admin.veronique-immobilier-saverne.fr

Cible : **GitHub → Vercel**, base de données **Neon** (déjà en place).

---

## 1. Envoyer le code sur GitHub

Le dépôt local est déjà initialisé et le premier commit est fait.
Le fichier `.env` (mots de passe, clés API) est **exclu** du dépôt.

1. Sur [github.com/new](https://github.com/new), créer un dépôt :
   - Nom : `giorgio-immo` (ou autre)
   - Visibilité : **Private** — le code touche à des données clients
   - Ne cocher **aucune** option d'initialisation (pas de README, .gitignore ni licence)

2. Dans le dossier `giorgio-immo-app`, lancer :

```bash
git remote add origin https://github.com/VOTRE-COMPTE/giorgio-immo.git
git push -u origin main
```

Au premier `push`, une fenêtre de connexion GitHub s'ouvre : s'authentifier avec
son compte. (Si aucune fenêtre n'apparaît, installer
[GitHub CLI](https://cli.github.com) puis `gh auth login`.)

---

## 2. Déployer sur Vercel

1. Sur [vercel.com/new](https://vercel.com/new), se connecter avec GitHub et
   importer le dépôt.
2. Vercel détecte Next.js automatiquement — ne rien changer aux réglages de build.
3. Avant de cliquer sur **Deploy**, renseigner les variables d'environnement
   (section *Environment Variables*) :

| Variable         | Valeur                                                            |
| ---------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`   | la chaîne Neon **pooled** (celle du `.env` local)                  |
| `APP_PASSWORD`   | le mot de passe d'accès au CRM — **obligatoire**                   |
| `AUTH_SECRET`    | chaîne aléatoire (voir ci-dessous)                                 |
| `APP_URL`        | `https://admin.veronique-immobilier-saverne.fr`                    |
| `RESEND_API_KEY` | la clé Resend                                                      |
| `RESEND_FROM`    | expéditeur des emails (voir §4)                                    |

Générer `AUTH_SECRET` :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ Si `APP_PASSWORD` est absent, l'application **bloque l'accès aux données**
> et affiche un message de configuration : elle ne s'ouvre jamais au public par
> accident.

### Stockage des pièces jointes (Vercel Blob)

Les fichiers joints à la checklist documentaire (titre de propriété, pièce
d'identité…) sont stockés dans un store **Vercel Blob privé** : ils ne sont
lisibles qu'à travers l'application, après connexion.

1. Dans le projet Vercel, onglet **Storage** → **Create Database** → **Blob**.
2. Choisir l'accès **Private**, puis connecter le store au projet (tous les
   environnements). Vercel ajoute seul la variable `BLOB_READ_WRITE_TOKEN`.
3. Pour le poste local, copier ce jeton dans `.env` (voir `.env.example`), puis
   redéployer pour que la variable soit prise en compte.

---

## 3. Brancher le domaine

Dans le projet Vercel : **Settings → Domains → Add**, saisir
`admin.veronique-immobilier-saverne.fr`.

Vercel indique alors l'enregistrement DNS à créer chez le registrar du domaine
`veronique-immobilier-saverne.fr` :

| Type    | Nom     | Valeur                  |
| ------- | ------- | ----------------------- |
| `CNAME` | `admin` | `cname.vercel-dns.com.` |

La propagation prend de quelques minutes à quelques heures. Le certificat HTTPS
est émis automatiquement par Vercel.

---

## 4. Emails (Resend)

Tant que le domaine n'est pas vérifié sur Resend, les emails ne partent que vers
votre propre adresse (mode test).

1. Sur [resend.com/domains](https://resend.com/domains), ajouter
   `veronique-immobilier-saverne.fr` et créer les enregistrements DNS demandés
   (SPF, DKIM) chez le registrar.
2. Une fois vérifié, mettre à jour sur Vercel :

```
RESEND_FROM="Véronique Noureddine <contact@veronique-immobilier-saverne.fr>"
RESEND_REPLY_TO="v.noureddine@bskimmobilier.com"
```

3. Redéployer (Vercel → Deployments → Redeploy) pour appliquer.

### Pourquoi ne pas expédier depuis l'adresse BSK ?

Resend (comme tout service d'envoi sérieux) authentifie des **domaines**, pas des
adresses isolées : il faut prouver qu'on contrôle le domaine en y ajoutant des
enregistrements DNS. Le domaine `bskimmobilier.com` appartient au réseau BSK, sa
zone DNS n'est pas accessible à un mandataire indépendant.

Expédier malgré tout depuis `@bskimmobilier.com` sans cette autorisation ferait
échouer les contrôles SPF/DKIM : les messages partiraient en spam, voire
seraient rejetés par Gmail et Outlook.

La solution retenue est celle de l'usage professionnel courant :

- **Expéditeur** : le domaine vérifié, au nom de Véronique — le destinataire voit
  bien « Véronique Noureddine » ;
- **Réponse** (`RESEND_REPLY_TO`) : l'adresse BSK habituelle — un clic sur
  « Répondre » écrit bien à `v.noureddine@bskimmobilier.com`.

Si un jour le service informatique de BSK accepte d'ajouter les enregistrements
DNS de Resend sur leur domaine, il suffira de basculer `RESEND_FROM` sur
l'adresse BSK.

---

## 5. Après mise en ligne — à vérifier

- [ ] `https://admin.veronique-immobilier-saverne.fr` demande le mot de passe
- [ ] `https://admin.veronique-immobilier-saverne.fr/rdv` est accessible **sans**
      mot de passe (page publique de prise de rendez-vous)
- [ ] Réserver un créneau de test → l'email de confirmation contient un lien vers
      le domaine (et non `localhost`)
- [ ] Les boutons « Je confirme » / « J'annule » fonctionnent

---

## Mises à jour ultérieures

Chaque `git push` sur `main` déclenche automatiquement un redéploiement.

```bash
git add -A
git commit -m "description de la modification"
git push
```

### Changement du schéma de base

Le schéma n'est pas migré automatiquement au déploiement. Après une modification
de `prisma/schema.prisma`, appliquer depuis le poste local :

```bash
npx prisma db push
```

---

## Rappel sécurité

- Ne jamais commiter `.env` (déjà exclu par `.gitignore`).
- En cas de fuite d'une clé : la révoquer chez Neon / Resend et la remplacer sur
  Vercel.
- Les données clients (coordonnées, pièces TRACFIN) sont des données
  personnelles : dépôt GitHub **privé** et mot de passe robuste.
