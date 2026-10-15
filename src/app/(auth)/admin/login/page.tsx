import type { Metadata } from "next";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex flex-col gap-4">
      <AdminLoginForm />
      {process.env.NODE_ENV !== "production" ? (
        <p className="rounded-md bg-gray-100 px-4 py-3 text-xs leading-5 text-gray-600">
          Environnement de développement : connectez-vous avec
          admin@avistrack.example et un mot de passe au choix.
        </p>
      ) : null}
    </div>
  );
}
