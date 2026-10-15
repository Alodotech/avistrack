"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_COMPANY_COOKIE } from "@/server/auth/session";
import { findCompanyByEmail } from "@/server/repositories/company-repository";

export type LoginState = { status: "idle" | "error"; message?: string };

const cookieOptions = { httpOnly: true, sameSite: "lax", path: "/" } as const;

export async function signInCompany(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (process.env.NODE_ENV === "production") {
    return {
      status: "error",
      message: "La connexion sera disponible prochainement.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return {
      status: "error",
      message: "Renseignez votre e-mail et votre mot de passe.",
    };
  }

  const company = await findCompanyByEmail(email);
  if (!company) {
    return {
      status: "error",
      message: "Aucun compte ne correspond à cette adresse e-mail.",
    };
  }

  (await cookies()).set(DEV_COMPANY_COOKIE, company.id, cookieOptions);
  redirect("/dashboard");
}
