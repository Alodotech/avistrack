import type { Mock } from "vitest";
import { vi } from "vitest";

/**
 * Double de test du client Supabase.
 *
 * Les suites d'isolation ne doivent plus dépendre d'un store en mémoire : elles
 * injectent un faux client (T05) et vérifient que les repositories demandent
 * bien au bon compte, sans jamais lire les données d'un autre.
 */

export type FakeRow = Record<string, unknown>;

export type FakeTable = {
  select: Mock;
  eq: Mock;
  is: Mock;
  ilike: Mock;
  in: Mock;
  gte: Mock;
  or: Mock;
  order: Mock;
  range: Mock;
  maybeSingle: Mock;
  single: Mock;
  insert: Mock;
  update: Mock;
};

/**
 * Construit une table factice dont chaque méthode renvoie la table (chaînage),
 * `maybeSingle`/`single`/`range`/`in`/`or` renvoyant `{ data, error }`.
 */
export function createFakeTable(
  result: { data?: unknown; error?: unknown; count?: number | null } = {},
): FakeTable {
  const settled = {
    data: result.data ?? null,
    error: result.error ?? null,
    count: result.count ?? null,
  };
  const table = {} as FakeTable;
  const chain = ["select", "eq", "is", "ilike", "gte", "order", "insert", "update"] as const;
  for (const method of chain) {
    table[method] = vi.fn(() => table);
  }
  table.in = vi.fn(() => table);
  table.or = vi.fn(() => table);
  table.range = vi.fn(async () => settled);
  table.maybeSingle = vi.fn(async () => settled);
  table.single = vi.fn(async () => settled);
  return table;
}

/** `from(tableName)` renvoie la table fournie pour ce nom. */
export function createFakeClient(tables: Record<string, FakeTable>) {
  return {
    from: vi.fn((name: string) => {
      const table = tables[name];
      if (!table) throw new Error(`Table non simulée : ${name}`);
      return table;
    }),
  };
}
