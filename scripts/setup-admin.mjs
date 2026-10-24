#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = "aurelazk004@gmail.com";
const password = "azk004";

if (!url || !serviceKey) {
  console.error("Clés manquantes dans .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("1) Création/récupération de l'utilisateur auth...");
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId;
  if (createErr) {
    if (createErr.message?.toLowerCase().includes("already")) {
      console.log("   Utilisateur existe déjà, recherche...");
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) throw listErr;
      const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found) throw new Error("Utilisateur introuvable malgré 'already exists'");
      userId = found.id;
      console.log("   Trouvé:", userId);
    } else {
      throw createErr;
    }
  } else {
    userId = created.user.id;
    console.log("   Créé:", userId);
  }

  console.log("2) Vérification de la table admins...");
  const { data: existingAdmin, error: checkErr } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (checkErr) {
    console.error("   Erreur lecture admins:", checkErr.message);
    console.error("\n   Les migrations n'ont probablement pas été appliquées.");
    console.error("   Applique d'abord 001, 002, 003 depuis le SQL Editor de Supabase.");
    process.exit(1);
  }

  if (existingAdmin) {
    console.log("   Déjà présent dans public.admins");
  } else {
    console.log("3) Ajout dans public.admins...");
    const { error: insErr } = await supabase.from("admins").insert({ user_id: userId, email });
    if (insErr) throw insErr;
    console.log("   Ajouté avec succès");
  }

  console.log("\n✅ Terminé");
  console.log("Connecte-toi sur http://localhost:3000/admin/login avec :");
  console.log("   Email :", email);
  console.log("   Mot de passe :", password);
}

main().catch((e) => {
  console.error("\n❌ Erreur:", e.message);
  process.exit(1);
});
