import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localEnv } from "./env";

/**
 * Vérification des politiques RLS sur une instance Supabase réelle (audit).
 *
 * Ces tests ne simulent rien : ils passent par l'API REST avec les mêmes clés
 * que l'application (`anon`, session utilisateur, `service_role`). Ils prouvent
 * que les garanties annoncées tiennent côté base, y compris face à un client
 * qui forgerait ses requêtes.
 *
 * La suite est ignorée si l'instance n'est pas joignable : `npm test` reste
 * vert sur une machine sans base locale.
 */

const env = localEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

async function reachable(): Promise<boolean> {
  if (!url || !anonKey || !serviceRoleKey) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    // `supabase-js` convertit les erreurs réseau en objet `error` sans code :
    // on interroge donc l'API REST directement pour distinguer « instance
    // injoignable » (skip) de « schéma absent » (instance joignable).
    await fetch(`${url}/rest/v1/companies?select=id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

const available = await reachable();
const RUN = available ? describe : describe.skip;

type TestAccount = {
  email: string;
  password: string;
  userId: string;
  token: string;
};

const createdUserIds: string[] = [];
const createdCompanyIds: string[] = [];

let admin: SupabaseClient;

function clientAs(token: string): SupabaseClient {
  return createClient(url as string, anonKey as string, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createAccount(label: string): Promise<TestAccount> {
  const email = `rls-${label}-${Date.now()}@avistrack.test`;
  const password = "MotDePasse-Test-2026";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Création du compte de test impossible : ${error?.message}`);
  }
  createdUserIds.push(data.user.id);

  // La connexion se fait sur un client jetable : `supabase-js` fait primer le
  // jeton de session sur la clé `service_role`, et le client d'administration
  // doit rester en `service_role` pour écrire dans les tables.
  const signInClient = createClient(url as string, anonKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signInError } = await signInClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !session.session) {
    throw new Error(`Connexion du compte de test impossible : ${signInError?.message}`);
  }

  return {
    email,
    password,
    userId: data.user.id,
    token: session.session.access_token,
  };
}

async function createCompany(
  account: TestAccount,
  options: { status?: "active" | "suspended" | "pending"; deleted?: boolean } = {},
): Promise<string> {
  const publicId = `rls${Math.random().toString(36).slice(2, 12)}`;
  const { data, error } = await admin
    .from("companies")
    .insert({
      user_id: account.userId,
      public_id: publicId,
      slug: `rls-${publicId}`,
      name: `Entreprise ${publicId}`,
      email: `${publicId}@avistrack.test`,
      phone: "+22900000000",
      status: options.status ?? "active",
      deleted_at: options.deleted ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Création de l'entreprise de test impossible : ${error?.message}`);
  }
  createdCompanyIds.push(data.id as unknown as string);
  return data.id as unknown as string;
}

/** Une requête refusée par PostgreSQL ou par le RLS ne doit rendre aucune ligne. */
function expectNoRows(result: { data: unknown; error: unknown }): void {
  const rows = Array.isArray(result.data) ? result.data : [];
  expect(rows).toEqual([]);
}

RUN("politiques RLS — surface publique", () => {
  let anonymous: SupabaseClient;
  let owner: TestAccount;
  let activeCompanyId: string;
  let suspendedCompanyId: string;
  let deletedCompanyId: string;
  let activePublicId: string;

  beforeAll(async () => {
    admin = createClient(url as string, serviceRoleKey as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    anonymous = createClient(url as string, anonKey as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    owner = await createAccount("public");

    activeCompanyId = await createCompany(owner);
    suspendedCompanyId = await createCompany(owner, { status: "suspended" });
    deletedCompanyId = await createCompany(owner, { deleted: true });

    const { data: publicIdRow } = await admin
      .from("companies")
      .select("public_id")
      .eq("id", activeCompanyId)
      .single();
    activePublicId = publicIdRow?.public_id as string;

    await admin.from("reviews").insert({
      company_id: activeCompanyId,
      rating: 5,
      comment: "Avis de référence",
      visit_date: "2026-01-01",
      answers: {},
    });
  });

  it("n'expose plus la liste des entreprises aux visiteurs anonymes", async () => {
    expectNoRows(await anonymous.from("companies").select("id, name"));
  });

  it("n'expose plus les formulaires aux visiteurs anonymes", async () => {
    expectNoRows(await anonymous.from("review_form_configs").select("company_id"));
  });

  it("ne laisse pas un visiteur énumérer les avis de la plateforme", async () => {
    expectNoRows(await anonymous.from("reviews").select("id, comment"));
  });

  it("laisse un visiteur anonyme déposer un avis sur une entreprise active", async () => {
    const { error } = await anonymous.from("reviews").insert({
      company_id: activeCompanyId,
      rating: 4,
      comment: "Avis anonyme",
      visit_date: "2026-02-02",
      answers: {},
    });
    expect(error).toBeNull();
  });

  it("refuse l'avis anonyme sur une entreprise suspendue", async () => {
    const { error } = await anonymous.from("reviews").insert({
      company_id: suspendedCompanyId,
      rating: 4,
      comment: "Avis refusé",
      visit_date: "2026-02-02",
      answers: {},
    });
    expect(error).not.toBeNull();
  });

  it("refuse l'avis anonyme sur une entreprise supprimée", async () => {
    const { error } = await anonymous.from("reviews").insert({
      company_id: deletedCompanyId,
      rating: 4,
      comment: "Avis refusé",
      visit_date: "2026-02-02",
      answers: {},
    });
    expect(error).not.toBeNull();
  });

  it("interdit à un visiteur d'écrire la colonne de modération d'un avis", async () => {
    const { error } = await anonymous.from("reviews").insert({
      company_id: activeCompanyId,
      rating: 5,
      comment: "Avis piégé",
      visit_date: "2026-02-02",
      answers: {},
      status: "published",
    });
    expect(error).not.toBeNull();
  });

  it("ne donne pas à un visiteur la lecture d'une entreprise par identifiant public", async () => {
    expectNoRows(
      await anonymous
        .from("companies")
        .select("id, name")
        .eq("public_id", activePublicId),
    );
  });
});

RUN("politiques RLS — cloisonnement des entreprises", () => {
  let owner: TestAccount;
  let stranger: TestAccount;
  let ownerCompanyId: string;
  let suspendedOwnedCompanyId: string;

  beforeAll(async () => {
    owner = await createAccount("cloison-owner");
    stranger = await createAccount("cloison-stranger");

    ownerCompanyId = await createCompany(owner);
    suspendedOwnedCompanyId = await createCompany(owner, { status: "suspended" });

    await admin.from("reviews").insert({
      company_id: ownerCompanyId,
      rating: 5,
      comment: "Avis privé du propriétaire",
      visit_date: "2026-03-03",
      answers: {},
    });
  });

  it("laisse le propriétaire lire ses propres avis", async () => {
    const asOwner = clientAs(owner.token);
    const { data, error } = await asOwner
      .from("reviews")
      .select("id, comment")
      .eq("company_id", ownerCompanyId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it("empêche un autre compte de lire les avis d'une entreprise", async () => {
    const asStranger = clientAs(stranger.token);
    const { data, error } = await asStranger
      .from("reviews")
      .select("id, comment")
      .eq("company_id", ownerCompanyId);
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });

  it("empêche un autre compte de lire le profil d'une entreprise", async () => {
    const asStranger = clientAs(stranger.token);
    const { data, error } = await asStranger
      .from("companies")
      .select("id, name")
      .eq("id", ownerCompanyId);
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });

  it("empêche une entreprise de réactiver son propre compte suspendu", async () => {
    const asOwner = clientAs(owner.token);
    const { error } = await asOwner
      .from("companies")
      .update({ status: "active" })
      .eq("id", suspendedOwnedCompanyId);
    expect(error).not.toBeNull();

    const { data } = await admin
      .from("companies")
      .select("status")
      .eq("id", suspendedOwnedCompanyId)
      .single();
    expect(data?.status).toBe("suspended");
  });

  it("empêche une entreprise de changer son propriétaire", async () => {
    const asOwner = clientAs(owner.token);
    const { error } = await asOwner
      .from("companies")
      .update({ user_id: stranger.userId })
      .eq("id", ownerCompanyId);
    expect(error).not.toBeNull();
  });

  it("laisse un visiteur connecté déposer un avis sur une entreprise active", async () => {
    const asStranger = clientAs(stranger.token);
    const { error } = await asStranger.from("reviews").insert({
      company_id: ownerCompanyId,
      rating: 3,
      comment: "Avis d'un visiteur connecté",
      visit_date: "2026-04-04",
      answers: {},
    });
    expect(error).toBeNull();
  });

  it("réserve le journal d'audit aux administrateurs", async () => {
    const asStranger = clientAs(stranger.token);
    expectNoRows(await asStranger.from("audit_logs").select("id"));
  });

  it("laisse l'administration lire l'intégralité des avis", async () => {
    const { data, error } = await admin
      .from("reviews")
      .select("id")
      .eq("company_id", ownerCompanyId);
    expect(error).toBeNull();
    expect(data?.length ?? 0).toBeGreaterThanOrEqual(1);
  });
});

afterAll(async () => {
  if (!admin) return;
  if (createdCompanyIds.length > 0) {
    await admin.from("companies").delete().in("id", createdCompanyIds);
  }
  for (const userId of createdUserIds) {
    await admin.auth.admin.deleteUser(userId);
  }
});
