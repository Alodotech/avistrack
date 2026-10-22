import type { NextRequest } from "next/server";
import { pingDatabase } from "@/server/repositories/company-repository";

/**
 * Sonde de disponibilité (`/api/health`).
 *
 * Sans paramètre, la route répond vite : elle vérifie que le processus
 * Next.js répond et que la configuration minimale est présente. Avec
 * `?deep=1`, elle interroge aussi la base de données.
 *
 * Elle ne renvoie jamais de secret : uniquement des états et, en cas d'échec,
 * un message court. À brancher sur la sonde de la plateforme d'hébergement.
 */

type CheckStatus = "ok" | "ko" | "skipped";

type Check = { status: CheckStatus; detail?: string };

export async function GET(request: NextRequest) {
  const deep = request.nextUrl.searchParams.get("deep") === "1";
  const checks: Record<string, Check> = {};

  checks.config = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? { status: "ok" }
    : { status: "ko", detail: "NEXT_PUBLIC_SUPABASE_URL absent" };

  if (deep) {
    checks.database = await checkDatabase();
  } else {
    checks.database = { status: "skipped", detail: "utiliser ?deep=1" };
  }

  const healthy = Object.values(checks).every(
    (check) => check.status !== "ko",
  );

  return Response.json(
    {
      status: healthy ? "ok" : "ko",
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

async function checkDatabase(): Promise<Check> {
  try {
    const result = await pingDatabase();
    return result.ok
      ? { status: "ok", detail: result.detail }
      : { status: "ko", detail: result.detail };
  } catch (error) {
    return {
      status: "ko",
      detail: error instanceof Error ? error.message : "erreur inconnue",
    };
  }
}
