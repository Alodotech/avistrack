# AvisTrack

## 🎯 But du Projet
**AvisTrack** est une plateforme SaaS B2B2C qui permet aux commerces et structures physiques (pharmacies, hôpitaux, boutiques, magasins, etc.) de collecter, gérer et analyser les avis de leurs clients via un **QR code unique**. 

L'objectif principal est de fournir un outil simple, institutionnel et hautement sécurisé garantissant une **isolation stricte des données** : les avis d'une entreprise ne sont jamais accessibles ou visibles par une entreprise concurrente.

La V1 du projet se concentre sur :
- **L'acquisition** (Landing page publique).
- **La collecte d'avis** (Formulaire mobile-first accessible par scan de QR code, sans création de compte client).
- **Le suivi et la gestion** (Dashboards d'entreprise et dashboard administrateur).

## 🛠️ Stack Technique
- **Framework** : Next.js 16 (App Router) full-stack
- **Langage** : TypeScript strict (aucun `any`)
- **Base de données** : PostgreSQL (Supabase)
- **Accès aux données** : `@supabase/supabase-js` via `@supabase/ssr` (requêtes typées, aucun ORM)
- **Authentification** : Supabase Auth (OAuth Google)
- **Sécurité** : Row Level Security PostgreSQL (isolation multi-tenant garantie en base)
- **Validation** : Zod
- **PDF / Excel** : `jspdf` + `jspdf-autotable`, `write-excel-file`
- **QR codes** : `qrcode`, rendu SVG et PNG (`sharp`)
- **Tests** : Vitest
- **Styling** : Tailwind CSS (Thème restreint : Blanc, Noir, Rouge)

## 👥 Collaboration et Stratégie Git (Pour l'équipe de développement)

Le développement s'organise autour d'une équipe de 3 développeurs. Voici la stratégie à adopter pour garantir la stabilité du code :

### 1. Les Branches Principales
- `main` : La branche de production. Le code ici est toujours stable et déployable. **Aucun commit direct n'y est autorisé.**
- `dev` : La branche principale d'intégration. Tout le travail validé y est fusionné avant de passer en production.

### 2. Démarrer sur le projet
1. **Cloner le dépôt :**
   ```bash
   git clone https://github.com/Alodotech/avistrack.git
   cd avistrack
   ```
2. **Se placer sur la branche dev :**
   ```bash
   git checkout dev
   ```
3. **Installer les dépendances :**
   ```bash
   npm install
   ```
4. **Configurer les variables d'environnement :**
   ```bash
   cp .env.example .env.local
   ```
   Puis renseigner dans `.env.local` :

   | Variable | Rôle |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique (anon) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Clé `service_role`, **serveur uniquement** |
   | `SUPABASE_PROJECT_ID` | Identifiant du projet (CLI `update-types`) |
   | `NEXT_PUBLIC_SITE_URL` | URL publique canonique (QR code, sitemap, redirections OAuth) |

   `.env.local` n'est jamais versionné. La clé `service_role` contourne les
   politiques RLS : elle ne doit jamais être exposée au navigateur.

5. **Appliquer le schéma de base de données :**
   ```bash
   supabase db push
   ```
   Les migrations `supabase/migrations/` créent le schéma, les index et les
   politiques RLS. Elles s'appliquent dans l'ordre :

   | Migration | Contenu |
   | --- | --- |
   | `001_initial_schema.sql` | Tables, index, clés étrangères |
   | `002_rls_policies.sql` | Politiques RLS initiales |
   | `003_security_and_purge.sql` | Durcissement RLS, RPC publiques, purge RGPD, `platform_stats()` |

   > `003_security_and_purge.sql` **doit** être appliquée avant toute mise en
   > production : elle retire l'énumération des entreprises par le rôle `anon`
   > et ajoute la purge automatique. Sur une base existante, appliquer
   > `supabase/migrations/003_security_and_purge.sql` avec `psql` ou
   > `supabase db push`.

6. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```

7. **Vérifier le projet avant de commiter :**
   ```bash
   npm run lint      # ESLint (aucun `any`, règles React)
   npm run typecheck # next typegen + tsc --noEmit
   npm run test      # Vitest
   npm run build     # build de production
   ```

8. **Vérifier l'isolation des données (optionnel, nécessite une base vivante) :**
   ```bash
   npm run test:rls  # 16 tests RLS contre l'API REST (anon, cloisonnement, purge)
   ```
   Ces tests lisent `.env.local` et s'exécutent contre l'instance configurée :
   ils vérifient qu'un visiteur non authentifié ne peut ni énumérer les
   entreprises ni déposer d'avis sur une entreprise suspendue ou supprimée.

9. **Charger un jeu de données de démonstration (optionnel) :**
   ```bash
   npm run db:seed
   ```
   Crée trois entreprises de démonstration (avec compte, formulaire et avis).
   Le script est idempotent : le relancer ne duplique rien. Les comptes créés
   utilisent le mot de passe `Demo1234!`.

### 3. Configuration de l'authentification Google
1. Supabase → **Authentication → Providers → Google** : activer le
   fournisseur, renseigner le `Client ID` et le `Client Secret` de la console
   Google.
2. Google Cloud Console → **OAuth 2.0 Client** : ajouter l'URI de redirection
   `https://<projet>.supabase.co/auth/v1/callback`.
3. Supabase → **Authentication → URL Configuration** : renseigner
   `NEXT_PUBLIC_SITE_URL` et l'URL de redirection `/auth/callback`.
4. Le premier administrateur est créé en insérant son compte Auth dans la
   table `admins` (`user_id`, `email`).

### 3. Workflow de développement (Créer une nouvelle fonctionnalité)
Chaque tâche (ticket) doit être développée sur sa propre branche.

1. **Mettre à jour la branche locale `dev` :**
   ```bash
   git checkout dev
   git pull origin dev
   ```
2. **Créer une nouvelle branche pour la tâche :**
   La nomenclature reprend l'identifiant du ticket :
   `feature/<identifiant-tache>-description` (par exemple
   `feature/T32-filtres-et-export-admin`), `fix/<identifiant-tache>-description`
   pour un correctif.
   ```bash
   git checkout -b feature/T32-filtres-et-export-admin
   ```
3. **Développer et commiter :**
   ```bash
   git add .
   git commit -m "Description de ce qui a été développé (ex: création du dashboard entreprise)"
   ```
4. **Pousser la branche sur GitHub :**
   ```bash
   git push origin feature/T32-filtres-et-export-admin
   ```
5. **Ouvrir une Pull Request (PR) :**
   Sur GitHub, créez une PR de votre branche vers `dev`. Une revue de code (Code Review) par un autre développeur est obligatoire, notamment pour vérifier **l'isolation des données** et la sécurité, avant de pouvoir fusionner (merge) le code.

## 🗑️ Cycle de vie des données (RGPD)

La suppression d'une entreprise est **logique** : la ligne passe en
`deleted_at` (conservation du compte d'avis et de la piste d'audit) puis est
**effacée définitivement** au bout de la période de rétention.

- **Rétention par défaut : 30 jours.**
- Purge automatique quotidienne à 03:17 UTC via `pg_cron`
  (job `avistrack-purge-companies`, créé par la migration 003).
- Filet de sécurité manuel, jouable à tout moment :
  ```bash
  npm run db:purge         # 30 jours
  npm run db:purge -- 15   # 15 jours
  ```
  Le script appelle la fonction PostgreSQL `purge_deleted_companies()` avec la
  clé `service_role` : la suppression est exécutée **en base**, pas depuis le
  client.

> Sur une installation où `pg_cron` est indisponible, la purge manuelle doit
> être planifiée par le cron de la plateforme d'hébergement (déploiement, CI…).

## 🩺 Exploitation

- **Sonde de disponibilité** : `GET /api/health` vérifie la configuration ;
  `GET /api/health?deep=1` interroge aussi la base de données. La réponse est
  un JSON `{ status, timestamp, checks }` (503 si une vérification échoue).
  À brancher sur la sonde de la plateforme d'hébergement.
- **Purge RGPD** : voir la section « Cycle de vie des données ».

## ⚠️ Vulnérabilités connues

`npm audit --omit=dev` ne signale **aucune** vulnérabilité sur les dépendances
de production. Il reste une alerte *high* sur `braces`, dépendance transitive
de `fast-glob` utilisée par `@next/eslint-plugin-next` : aucun correctif
n'est publié à ce jour (`braces@3.0.3` est la dernière version). Elle
n'affecte que l'outillage de développement, pas l'application exécutée.

## 🛡️ Sécurité : Règle d'or
**L'isolation multi-tenant est critique.** Toute requête sur la base de données concernant les avis (`Review`) doit impérativement inclure un filtre sur le `company_id` récupéré depuis la **session serveur**, et non depuis la requête du client.

## 📁 Arborescence
```
src/
  app/            pages (App Router), routes API, server actions
  components/     UI partagée (marketing, admin, entreprise, avis)
  lib/            logique pure (format, filtres, exports, stats)
  server/         accès base de données, authentification, services
  types/          types Supabase générés à la main
  utils/          clients Supabase (navigateur, serveur, service_role)
supabase/migrations/   migrations SQL (schéma, RLS, purge)
scripts/                scripts d'exploitation (purge RGPD)
tests/                  tests Vitest (unitaires + intégration RLS)
```
