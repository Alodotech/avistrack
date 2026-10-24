"use client";

import type { ReactNode } from "react";
import { useAuthModal } from "./auth-modal-context";
import { buttonClass } from "@/components/ui/button";

interface OpenAuthButtonProps {
  mode?: "login" | "signup";
  children?: ReactNode;
  className?: string;
}

export function OpenAuthButton({
  mode = "signup",
  children = "Créer mon compte",
  className = "",
}: OpenAuthButtonProps) {
  const { openLogin, openSignup } = useAuthModal();

  const handleClick = () => {
    if (mode === "login") {
      openLogin();
    } else {
      openSignup();
    }
  };

  const defaultClasses = className || buttonClass("primary");

  return (
    <button
      type="button"
      onClick={handleClick}
      className={defaultClasses}
    >
      {children}
    </button>
  );
}
