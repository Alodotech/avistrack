import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ADMIN_LOGIN_PATH } from "@/server/auth/guards";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Proxy de protection des routes (T15).
 *
 * Next.js 16 a renommé le fichier `middleware` en `proxy` : les mêmes règles
 * s'appliquent. Il rafraîchit la session Supabase à chaque requête, puis pose
 * des redirections optimistes. Ces vérifications ne remplacent pas les gardes
 * serveur (`requireCompany`/`requireAdmin`), qui restent l'autorité finale.
 *
 * Le proxy ne redirige PAS un visiteur déjà connecté vers `/dashboard` : la
 * destination dépend de son état (entreprise, administrateur, onboarding en
 * cours, fiche supprimée). C'est la page qui décide, via `getAccountState()`.
 * Rediriger ici créait une boucle pour les administrateurs et les comptes
 * supprimés.
 */

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { supabase, response } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== ADMIN_LOGIN_PATH;
  const isCompanyRoute = pathname.startsWith("/dashboard");

  if (!user && (isAdminRoute || isCompanyRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = isAdminRoute ? ADMIN_LOGIN_PATH : "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf :
     * - les ressources statiques (_next/static, _next/image, favicon)
     * - les fichiers d'images
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|hdr|ico)$).*)",
  ],
};
