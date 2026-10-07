# avistrack

## Présentation
Bienvenue sur le projet **avistrack**, une application fullstack basée sur Next.js.

## Collaboration et Stratégie Git (Pour les 2 Développeurs)

Ce projet est développé en équipe. Voici comment nous allons travailler ensemble de manière organisée :

### 1. Branches et Workflow
- `main` : La branche principale de production. Le code ici doit toujours être stable. On n'y pousse jamais de code directement.
- `dev` : La branche principale d'intégration. Toutes les nouvelles fonctionnalités et correctifs sont fusionnés ici avant d'aller sur `main`.

### 2. Comment cloner et démarrer le projet
Pour commencer à travailler sur le projet, voici les étapes :

1. **Cloner le dépôt :**
   ```bash
   git clone https://github.com/Alodotech/avistrack.git
   cd avistrack
   ```

2. **Se placer sur la branche d'intégration (dev) :**
   ```bash
   git checkout dev
   ```

3. **Installer les dépendances (une fois le projet Next.js initialisé) :**
   ```bash
   npm install
   ```

4. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```

### 3. Travailler sur une nouvelle fonctionnalité (Feature Branch)
Chaque développeur travaille sur sa propre branche avant de fusionner son travail avec les autres.

1. **Assurez-vous d'être à jour avec la branche `dev` :**
   ```bash
   git checkout dev
   git pull origin dev
   ```
2. **Créez une nouvelle branche pour votre tâche :**
   Préfixez le nom de la branche par `feature/` (nouvelle fonctionnalité) ou `fix/` (correction de bug).
   ```bash
   git checkout -b feature/nom-de-votre-tache
   ```
3. **Faites vos modifications et commitez :**
   ```bash
   git add .
   git commit -m "Ajout de la page de connexion"
   ```
4. **Poussez votre branche sur le dépôt distant (GitHub) :**
   ```bash
   git push origin feature/nom-de-votre-tache
   ```
5. **Faire une Pull Request (PR) :**
   Sur GitHub, ouvrez une Pull Request de votre branche vers la branche `dev`. L'autre développeur peut relire le code et le valider avant de le fusionner (merge).

## Stack Technique Prévue
- Frontend / Backend : Next.js
- *Autres technologies à définir...*
