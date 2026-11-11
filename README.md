# Boutika — Gestion PME CEMAC

Application de gestion pour petites et moyennes entreprises de la zone CEMAC : boutiques multiples, stock en temps réel, caisse, facturation, paiements Mobile Money (MTN MoMo / Orange Money) et exports PDF/CSV.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Prisma 6** + **SQLite**
- **Tailwind CSS 4**
- **pdf-lib** (génération des PDF de ventes et factures)

## Fonctionnalités

- **Tableau de bord** : chiffre d'affaires du jour, marge, créances, alertes de stock, graphiques 7 jours et répartition des paiements.
- **Caisse / Ventes** : panier multi-produits, décrément automatique du stock, modes espèces / MTN MoMo / Orange Money / crédit.
- **Stock** : création, modification, suppression de produits, seuils d'alerte et ajustements de stock.
- **Factures** : création avec TVA configurable (19,25 % par défaut), suivi des statuts (envoyée / payée / retard), encaissement et PDF.
- **Paiements** : historique des paiements Mobile Money et espèces, liés aux ventes ou aux factures.
- **Boutiques** : gestion multi-boutiques et activation/désactivation.
- **Paramètres** : entreprise, ville, téléphone, taux de TVA et opérateurs activés.
- **Exports** : CSV et PDF (ventes et factures).
- **Réinitialisation** de la démo en un clic (données de test régénérées).

## Prérequis

- Node.js **20.9+**
- npm

## Installation

```bash
npm install
```

Créez un fichier `.env` à la racine (non versionné) :

```env
DATABASE_URL="file:./dev.db"
```

Générez le client Prisma puis créez le schéma SQLite :

```bash
npx prisma generate
npx prisma db push
```

Lancez le serveur de développement :

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Scripts

| Commande        | Description                        |
| --------------- | ---------------------------------- |
| `npm run dev`   | Serveur de développement           |
| `npm run build` | Build de production                |
| `npm run start` | Démarre le build de production     |
| `npm run lint`  | Analyse ESLint                     |

## Base de données et seed

La base est un fichier SQLite local : `prisma/dev.db` (`DATABASE_URL="file:./dev.db"`).

### Modèles

`Boutique`, `Produit`, `Vente` / `VenteLigne`, `Facture` / `FactureLigne`, `Paiement`, `Parametres`.

Les relations utilisent `onDelete: Cascade` (lignes de documents) et `SetNull` (référence produit/paiement), et les documents sont indexés par boutique et par date.

### Seed automatique

Le seed est **exécuté automatiquement au premier chargement** de l'application, via `GET /api/bootstrap` → `chargerTout()` → `seedDatabase()`.

- Source des données : `src/lib/seed.ts` (déterministe, graine `20261110`).
- Persistance : `src/lib/server/seed-db.ts`.
- Le seed ne s'exécute que si la table `Boutique` est vide : il est donc idempotent et ne duplique pas les données.

Contenu généré :

| Entité                      | Volume                                         |
| --------------------------- | ---------------------------------------------- |
| Boutiques                   | 3 (Akwa, Bonabéri, Maképé — Douala)            |
| Produits                    | 42 (18 Akwa, 12 Bonabéri, 12 Maképé)           |
| Ventes + lignes             | 252 ventes sur 21 jours, 468 lignes            |
| Factures + lignes           | 6 factures, 16 lignes                          |
| Paiements                   | 237 (235 liés à des ventes, 2 à des factures)  |
| Paramètres                  | 1 (Groupe Sawa Distribution, TVA 19,25 %)      |

Les dates du seed sont relatives au moment de l'import (les 21 derniers jours), les montants sont en FCFA.

### Réinitialiser les données

- Depuis l'interface : bouton de réinitialisation de la démo.
- Via l'API : `POST /api/reset` supprime toutes les données puis relance le seed.

Pour repartir d'une base vierge :

```bash
npx prisma db push --force-reset
```

## API

| Méthode | Route                    | Description                                      |
| ------- | ------------------------ | ------------------------------------------------ |
| GET     | `/api/bootstrap`         | État complet de l'application (déclenche le seed)|
| POST    | `/api/reset`             | Réinitialise et re-seed la base                  |
| POST    | `/api/boutiques`         | Créer une boutique                               |
| PATCH   | `/api/boutiques/:id`     | Modifier / activer une boutique                  |
| POST    | `/api/produits`          | Créer un produit                                 |
| PATCH   | `/api/produits/:id`      | Modifier un produit (`stockDelta` pour le stock) |
| DELETE  | `/api/produits/:id`      | Supprimer un produit                             |
| POST    | `/api/ventes`            | Créer une vente (paiement auto hors crédit)      |
| GET     | `/api/ventes/:id/pdf`    | PDF d'une vente                                  |
| POST    | `/api/factures`          | Créer une facture                                |
| DELETE  | `/api/factures/:id`      | Supprimer une facture                            |
| POST    | `/api/factures/:id/payer`| Encaisser une facture                            |
| GET     | `/api/factures/:id/pdf`  | PDF d'une facture                                |
| PUT     | `/api/parametres`        | Mettre à jour les paramètres                     |

## Structure du projet

```text
prisma/
  schema.prisma            Schéma de données
  dev.db                   Base SQLite locale
src/
  app/                     Pages (dashboard, ventes, stock, factures, paiements, boutiques, paramètres)
    api/                   Routes API
  components/              Shell, composants UI, graphiques, icônes
  lib/
    seed.ts                Données de démonstration déterministes
    store.tsx              Contexte React + appels API
    types.ts               Types partagés
    format.ts, export.ts   Formatage FCFA/dates et export CSV
    server/
      prisma.ts            Client Prisma (singleton)
      queries.ts           Chargement global + auto-seed
      seed-db.ts           Persistance du seed
      dto.ts, http.ts, pdf.ts
```

## Notes

- Application de démonstration : pas d'authentification ni de gestion multi-utilisateurs.
- Aucun dossier `migrations` n'est utilisé ; le schéma est appliqué avec `prisma db push`.
- Modifier `prisma/schema.prisma` nécessite de relancer `npx prisma generate` puis `npx prisma db push`.
