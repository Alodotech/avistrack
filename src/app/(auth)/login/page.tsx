import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-4">
      <LoginForm />
      {process.env.NODE_ENV !== "production" ? (
        <p className="rounded-md bg-gray-100 px-4 py-3 text-xs leading-5 text-gray-600">
          Environnement de développement : connectez-vous avec l&apos;e-mail
          d&apos;un commerce de démonstration (par exemple
          contact@pharmaciecampguezo.example ou contact@boutiqueelgance.example)
          et un mot de passe au choix.
        </p>
      ) : null}
    </div>
  );
}
