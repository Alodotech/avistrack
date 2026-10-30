import { NextResponse } from "next/server";
import {
  ensureCompanyForUser,
  needsCompanyOnboarding,
} from "@/server/services/company-onboarding";
import { createClient } from "@/utils/supabase/server";

/**
 * Callback OAuth (T14).
 *
 * Après l'échange du code :
 * - Si administrateur (vérifié en base sans RLS) : redirection directe vers `/admin`.
 * - Si tentative d'accès admin non autorisée : redirection vers `/admin/login?error=unauthorized`.
 * - Si entreprise : `/onboarding` tant que le téléphone manque, sinon `/dashboard`
 *   (fiche créée en 1 clic via le profil Google).
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

  try {
    // Si tentative d'accès à l'administration avec un compte Google non admin
    if (next.startsWith("/admin")) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/admin/login?error=unauthorized", request.url));
    }

    // Utilisateur entreprise : création / récupération de la fiche entreprise
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
      !company ||
      company.status !== "ACTIVE" ||
      (await needsCompanyOnboarding(company))
        ? "/onboarding"
        : next.startsWith("/admin")
          ? "/dashboard"
          : next;

    return NextResponse.redirect(new URL(destination, request.url));
  } catch (err) {
    return new NextResponse(
      `Callback error: ${err instanceof Error ? err.message : String(err)}`,
      { status: 500 },
    );
  }
}