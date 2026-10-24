import { redirect } from "next/navigation";
import { ensureCompanyForUser } from "@/server/services/company-onboarding";
import { createClient } from "@/utils/supabase/server";

/**
 * Callback OAuth (T14).
 *
 * Après l'échange du code, l'utilisateur est orienté vers son tableau de
 * bord. S'il n'a pas encore de fiche entreprise, elle est créée à partir de
 * son profil Google : il n'a rien à saisir pour démarrer.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return new Response("Missing code", { status: 400 });
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return new Response("Authentication failed", { status: 400 });
  }

  const { user } = data;

  // La fiche entreprise est créée si besoin (statut `active` par défaut).
  const company = await ensureCompanyForUser({
    id: user.id,
    email: user.email ?? null,
    fullName:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : null,
  });

  if (!company) {
    // Échec de la création (e-mail déjà rattaché) : l'onboarding prend le relais.
    redirect("/onboarding");
  }

  // Un compte suspendu ou en attente passe par l'onboarding : il doit
  // compléter ou régulariser sa situation avant d'accéder au tableau de bord.
  redirect(company.status === "ACTIVE" ? "/dashboard" : "/onboarding");
}
