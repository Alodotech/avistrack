#!/usr/bin/env node
/**
 * Jeu de données de démonstration (`npm run db:seed`).
 *
 * Crée trois entreprises de démonstration (avec leur compte d'authentification,
 * leur formulaire d'avis et une dizaine d'avis) afin de travailler sur un jeu
 * de données réaliste en local.
 *
 * Le script est idempotent : relancer la commande ne duplique ni comptes ni
 * entreprises. Il utilise la clé `service_role` et n'a donc aucun effet sur
 * une base de production si on ne le lance pas explicitement.
 *
 * Prérequis : les migrations `supabase/migrations/` sont appliquées.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEMO_PASSWORD = "Demo1234!";

const QUESTIONS = [
  {
    id: "rating",
    type: "rating",
    label: "Comment s'est passée votre visite ?",
    required: true,
  },
  {
    id: "comment",
    type: "text",
    label: "Votre commentaire",
    required: false,
  },
  {
    id: "visit",
    type: "date",
    label: "Date de votre visite",
    required: false,
  },
];

const COMPANIES = [
  {
    name: "Pharmacie du Centre",
    email: "demo@avistrack.test",
    phone: "+33 1 84 80 00 01",
    status: "active",
    reviews: [
      { rating: 5, comment: "Accueil chaleureux et conseils très utiles." },
      { rating: 5, comment: "Équipe disponible et à l'écoute." },
      { rating: 4, comment: "Très bon magasin, un peu d'attente." },
      { rating: 5, comment: null },
      { rating: 4, comment: "Bon suivi de ma commande." },
      { rating: 3, comment: "L'attente en queue était longue." },
      { rating: 5, comment: "Parfait, comme toujours." },
    ],
  },
  {
    name: "Boulangerie Martin",
    email: "boulangerie@avistrack.test",
    phone: "+33 1 84 80 00 02",
    status: "active",
    reviews: [
      { rating: 5, comment: "Des baguettes impeccables." },
      { rating: 4, comment: "Très bon pain,Accueil souriant." },
      { rating: 5, comment: null },
      { rating: 4, comment: "Le croissant est excellent." },
      { rating: 5, comment: "Pause déjeuner parfaite." },
    ],
  },
  {
    name: "Garage Petit",
    email: "garage@avistrack.test",
    phone: "+33 1 84 80 00 03",
    status: "suspended",
    reviews: [
      { rating: 3, comment: "Rendez-vous décalé de quinze minutes." },
      { rating: 2, comment: "Délai de réparation un peu long." },
    ],
  },
];

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  const content = readFileSync(file, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (!key || key in process.env) continue;
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publicId(name) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slugify(name)}-${suffix}`;
}

/** Date ISO décalée de `days` jours en arrière. */
function daysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Retrouve l'identifiant du compte d'authentification d'une adresse e-mail.
 *
 * Le compte est créé s'il n'existe pas. Si la création échoue parce que le
 * compte existe déjà, on tente de le relire via l'API d'administration.
 */
async function ensureUser(supabase, email) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (!error) return data.user.id;

  const alreadyExists =
    error.message?.toLowerCase().includes("already") ||
    error.status === 422;
  if (!alreadyExists) {
    throw new Error(`Création du compte ${email} : ${error.message}`);
  }

  // Le compte existe déjà : on le récupère par son e-mail.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) {
    throw new Error(
      `Le compte ${email} existe déjà et l'API d'administration ne permet pas de le relire (${listError.message}). ` +
        "Supprimez la fiche entreprise correspondante puis relancez le seed.",
    );
  }
  const found = list.users.find((user) => user.email === email);
  if (!found) throw new Error(`Compte ${email} introuvable.`);
  return found.id;
}

async function main() {
  loadEnvFile(resolve(ROOT, ".env.local"));
  loadEnvFile(resolve(ROOT, ".env"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error(
      "Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const company of COMPANIES) {
    /*
     * L'entreprise est recherchée en premier : son `user_id` donne le compte
     * d'authentification sans passer par l'API d'administration (qui n'est pas
     * toujours disponible sur une instance locale).
     */
    const { data: existing } = await supabase
      .from("companies")
      .select("id, user_id")
      .eq("email", company.email)
      .is("deleted_at", null)
      .maybeSingle();

    let companyId = existing?.id ?? null;

    if (!companyId) {
      const userId = await ensureUser(supabase, company.email);
      const { data: created, error: createError } = await supabase
        .from("companies")
        .insert({
          user_id: userId,
          public_id: publicId(company.name),
          name: company.name,
          slug: slugify(company.name),
          email: company.email,
          phone: company.phone,
          status: company.status,
        })
        .select("id")
        .single();
      if (createError) throw createError;
      companyId = created.id;
      console.log(`Entreprise créée : ${company.name}`);
    } else {
      console.log(`Entreprise existante : ${company.name}`);
    }

    const { error: configError } = await supabase
      .from("review_form_configs")
      .upsert(
        {
          company_id: companyId,
          thanks_title: "Merci pour votre avis !",
          thanks_message:
            "Votre retour aide le commerce à mieux vous accueillir la prochaine fois.",
          allow_comment: true,
          accent_color: "#d71920",
          questions: QUESTIONS,
        },
        { onConflict: "company_id" },
      );
    if (configError) throw configError;

    const { count } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    if ((count ?? 0) > 0) {
      console.log(`  ${count} avis déjà présents : avis non réinsérés.`);
      continue;
    }

    const rows = company.reviews.map((review, index) => ({
      company_id: companyId,
      rating: review.rating,
      comment: review.comment,
      visit_date: daysAgo(index * 6 + 1),
      answers: { rating: review.rating, comment: review.comment ?? "" },
      created_at: new Date(
        Date.now() - (index * 6 + 1) * 24 * 60 * 60 * 1000,
      ).toISOString(),
    }));

    const { error: reviewError } = await supabase.from("reviews").insert(rows);
    if (reviewError) throw reviewError;
    console.log(`  ${rows.length} avis insérés.`);
  }

  console.log(
    `\nJeu de démonstration prêt. Comptes : ${COMPANIES.map((c) => c.email).join(", ")} (mot de passe : ${DEMO_PASSWORD}).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
