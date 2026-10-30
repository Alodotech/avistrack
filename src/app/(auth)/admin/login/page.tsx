import { connection } from "next/server";
import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ADMIN_HOME_PATH } from "@/server/auth/guards";
import { getAccountState } from "@/server/auth/account-state";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false },
};

export const instant = false;

export default async function AdminLoginPage() {
  await connection();
  const state = await getAccountState();
  if (state.kind === "admin") redirect(ADMIN_HOME_PATH);

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={null}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
