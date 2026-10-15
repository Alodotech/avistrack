"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_ADMIN_COOKIE } from "@/server/auth/session";
import { findAdminByEmail } from "@/server/repositories/admin-repository";

export type AdminLoginState = { status: "idle" | "error"; message?: string };

const cookieOptions = { httpOnly: true, sameSite: "lax", path: "/" } as const;

export async function signInAdmin(
  _previous: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
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

  const admin = await findAdminByEmail(email);
  if (!admin) {
    return {
      status: "error",
      message: "Aucun administrateur ne correspond à cette adresse e-mail.",
    };
  }

  (await cookies()).set(DEV_ADMIN_COOKIE, admin.id, cookieOptions);
  redirect("/admin");
}
