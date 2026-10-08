import "server-only";
import type {
  Admin,
  AuditLogEntry,
  Company,
  CompanyStatus,
  Rating,
  Review,
} from "@/server/domain";

/**
 * Jeu de données en mémoire, UNIQUEMENT pour le développement et les tests.
 *
 * Il tient la place de PostgreSQL/Prisma tant que le socle backend n'est pas
 * livré. Seuls les repositories y accèdent : pour brancher Prisma, on remplace
 * leur implémentation sans toucher aux dashboards.
 */

export type CompanyRecord = Company & { deletedAt: Date | null };

type Store = {
  companies: CompanyRecord[];
  reviews: Review[];
  admins: Admin[];
  auditLog: AuditLogEntry[];
};

export const DEV_IDS = {
  companyA: "11111111-1111-4111-8111-111111111111",
  companyB: "22222222-2222-4222-8222-222222222222",
  companySuspended: "33333333-3333-4333-8333-333333333333",
  companyPending: "44444444-4444-4444-8444-444444444444",
  admin: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

const COMMENTS = [
  "Accueil très professionnel, je recommande.",
  "Un peu d'attente en caisse mais personnel aimable.",
  "Conseils clairs et précis, merci.",
  "Produit indisponible, dommage.",
  "Rapide et efficace.",
  "Lieu propre et bien organisé.",
  "Le personnel a pris le temps de m'expliquer.",
  "Horaires d'ouverture peu pratiques.",
];

const EXTRA_COMPANIES = [
  "Boulangerie du Marché",
  "Clinique Sainte-Rita",
  "Librairie Notre-Dame",
  "Optique Akpakpa",
  "Garage Étoile",
  "Supermarché Le Bon Prix",
  "Cabinet Dentaire Ganhi",
  "Restaurant La Terrasse",
  "Quincaillerie Générale",
  "Laboratoire Bio-Santé",
];

/** Générateur déterministe : les données de démo sont stables d'un redémarrage à l'autre. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededUuid(prefix: string, index: number): string {
  return `${prefix}-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function seed(): Store {
  const now = Date.now();
  const random = mulberry32(20261008);

  const company = (
    id: string,
    publicId: string,
    name: string,
    status: CompanyStatus,
    daysAgo: number,
  ): CompanyRecord => ({
    id,
    publicId,
    name,
    email: `contact@${name
      .normalize("NFD")
      .replace(/[^a-zA-Z]+/g, "")
      .toLowerCase()}.example`,
    phone: "+22901970000" + String(daysAgo % 100).padStart(2, "0"),
    status,
    createdAt: new Date(now - daysAgo * DAY_MS),
    deletedAt: null,
  });

  const companies: CompanyRecord[] = [
    company(DEV_IDS.companyA, "V1StGXR8_Z5jdHi6B-myT", "Pharmacie Camp Guézo", "ACTIVE", 62),
    company(DEV_IDS.companyB, "k9Qm2xLr7WpTz4HbN_e1c", "Boutique Élégance", "ACTIVE", 41),
    company(DEV_IDS.companySuspended, "Zt3vY8uA1sDf6GhJ0kLpQ", "Magasin Central", "SUSPENDED", 90),
    company(DEV_IDS.companyPending, "b7NcX2mVq9WeRt5Yu1IoP", "Hôtel du Lac", "PENDING", 2),
    ...EXTRA_COMPANIES.map((name, index) =>
      company(
        seededUuid("5eed0000", index + 1),
        `demo${String(index + 1).padStart(2, "0")}_AbCdEfGhIjKlMnO`,
        name,
        "ACTIVE",
        5 + index * 9,
      ),
    ),
  ];

  const reviewCounts = new Map<string, number>([
    [DEV_IDS.companyA, 47],
    [DEV_IDS.companyB, 12],
    [DEV_IDS.companySuspended, 8],
    [DEV_IDS.companyPending, 0],
  ]);

  const reviews: Review[] = [];
  for (const { id: companyId } of companies) {
    const count = reviewCounts.get(companyId) ?? Math.floor(random() * 6);
    for (let i = 0; i < count; i++) {
      const createdAt = new Date(now - Math.floor(random() * 60 * DAY_MS));
      // Répartition volontairement favorable, comme sur un vrai commerce.
      const rating = (random() < 0.7 ? 4 + Math.floor(random() * 2) : 1 + Math.floor(random() * 3)) as Rating;
      reviews.push({
        id: seededUuid("0e71e000", reviews.length + 1),
        companyId,
        rating,
        comment: random() < 0.75 ? COMMENTS[Math.floor(random() * COMMENTS.length)] : null,
        visitDate: createdAt.toISOString().slice(0, 10),
        createdAt,
      });
    }
  }

  return {
    companies,
    reviews,
    admins: [{ id: DEV_IDS.admin, email: "admin@avistrack.example" }],
    auditLog: [],
  };
}

const globalForStore = globalThis as typeof globalThis & {
  __avistrackDevStore?: Store;
};

export function getStore(): Store {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Le jeu de données en mémoire est réservé au développement : branchez les repositories sur Prisma avant toute mise en production.",
    );
  }
  return (globalForStore.__avistrackDevStore ??= seed());
}

export function resetStore(): void {
  globalForStore.__avistrackDevStore = undefined;
}
