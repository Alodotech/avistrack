"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { DEV_ADMIN_COOKIE, DEV_COMPANY_COOKIE } from "@/server/auth/session";
import { DEV_IDS } from "@/server/dev/memory-store";

const DEV_COMPANY_IDS: readonly string[] = [
  DEV_IDS.companyA,
  DEV_IDS.companyB,
  DEV_IDS.companySuspended,
  DEV_IDS.companyPending,
];

function assertDevelopment(): void {
  if (process.env.NODE_ENV === "production") notFound();
}

const cookieOptions = { httpOnly: true, sameSite: "lax", path: "/" } as const;

export async function signInAsCompany(formData: FormData): Promise<void> {
  assertDevelopment();
  const companyId = String(formData.get("companyId") ?? "");
  if (!DEV_COMPANY_IDS.includes(companyId)) notFound();
  (await cookies()).set(DEV_COMPANY_COOKIE, companyId, cookieOptions);
  redirect("/dashboard");
}

export async function signInAsAdmin(): Promise<void> {
  assertDevelopment();
  (await cookies()).set(DEV_ADMIN_COOKIE, DEV_IDS.admin, cookieOptions);
  redirect("/admin");
}

export async function signOutAll(): Promise<void> {
  assertDevelopment();
  const cookieStore = await cookies();
  cookieStore.delete(DEV_COMPANY_COOKIE);
  cookieStore.delete(DEV_ADMIN_COOKIE);
  redirect("/dev/session");
}
