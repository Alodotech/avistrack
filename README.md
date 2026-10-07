# AvisTrack

## 🎯 But du Projet
**AvisTrack** est une plateforme SaaS B2B2C qui permet aux commerces et structures physiques (pharmacies, hôpitaux, boutiques, magasins, etc.) de collecter, gérer et analyser les avis de leurs clients via un **QR code unique**. 

L'objectif principal est de fournir un outil simple, institutionnel et hautement sécurisé garantissant une **isolation stricte des données** : les avis d'une entreprise ne sont jamais accessibles ou visibles par une entreprise concurrente.

La V1 du projet se concentre sur :
- **L'acquisition** (Landing page publique).
- **La collecte d'avis** (Formulaire mobile-first accessible par scan de QR code, sans création de compte client).
- **Le suivi et la gestion** (Dashboards d'entreprise et dashboard administrateur).

## 🛠️ Stack Technique
- **Framework** : Next.js (App Router) full-stack
- **Langage** : TypeScript strict
- **Base de données** : PostgreSQL
- **ORM** : Prisma
- **Styling** : Tailwind CSS (Thème restreint : Blanc, Noir, Rouge)
- **Authentification** : Auth.js (Credentials avec JWT)
- **Validation** : Zod

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
4. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```

### 3. Workflow de développement (Créer une nouvelle fonctionnalité)
Chaque tâche (ticket) doit être développée sur sa propre branche.

1. **Mettre à jour la branche locale `dev` :**
   ```bash
   git checkout dev
   git pull origin dev
   ```
2. **Créer une nouvelle branche pour la tâche :**
   Utilisez une nomenclature claire, par exemple `feature/...` pour une nouveauté ou `fix/...` pour un correctif.
   ```bash
   git checkout -b feature/nom-de-la-tache
   ```
3. **Développer et commiter :**
   ```bash
   git add .
   git commit -m "Description de ce qui a été développé (ex: création du dashboard entreprise)"
   ```
4. **Pousser la branche sur GitHub :**
   ```bash
   git push origin feature/nom-de-la-tache
   ```
5. **Ouvrir une Pull Request (PR) :**
   Sur GitHub, créez une PR de votre branche vers `dev`. Une revue de code (Code Review) par un autre développeur est obligatoire, notamment pour vérifier **l'isolation des données** et la sécurité, avant de pouvoir fusionner (merge) le code.

## 🛡️ Sécurité : Règle d'or
**L'isolation multi-tenant est critique.** Toute requête sur la base de données concernant les avis (`Review`) doit impérativement inclure un filtre sur le `company_id` récupéré depuis la **session serveur**, et non depuis la requête du client.
# avistrack
