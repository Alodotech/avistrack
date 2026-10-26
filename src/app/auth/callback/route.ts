import { NextResponse } from "next/server";
import { checkAndSyncAdminOAuth } from "@/server/repositories/admin-repository";
import { ensureCompanyForUser } from "@/server/services/company-onboarding";
import { createClient } from "@/utils/supabase/server";

/**
 * Callback OAuth (T14).
 *
 * Après l'échange du code :
 * - Si administrateur (vérifié en base sans RLS) : redirection directe vers `/admin`.
 * - Si tentative d'accès admin non autorisée : redirection vers `/admin/login?error=unauthorized`.
 * - Si entreprise : orientation vers `/dashboard` (fiche créée en 1 clic via profil Google).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return new NextResponse("Missing code", { status: 400 });
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return new NextResponse("Authentication failed", { status: 400 });
  }

  const { user } = data;

  // 1. Vérification prioritaire si l'utilisateur est administrateur.
  let isAdmin = false;
  try {
    isAdmin = await checkAndSyncAdminOAuth(user.id, user.email);
  } catch (err) {
    console.error("Erreur lors de la vérification admin dans auth/callback:", err);
  }

  // Si administrateur : redirection DIRECTE vers /admin, sans JAMAIS passer par le dashboard entreprise
  if (isAdmin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Si tentative d'accès à l'administration avec un compte Google non admin
  if (next.startsWith("/admin")) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/login?error=unauthorized", request.url));
  }

  // 2. Utilisateur entreprise : création / récupération de la fiche entreprise
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

  const destination =
    !company || company.status !== "ACTIVE"
      ? "/onboarding"
      : next.startsWith("/admin")
        ? "/dashboard"
        : next;

  return NextResponse.redirect(new URL(destination, request.url));
}
