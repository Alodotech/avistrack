"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthMode = "login" | "signup";

interface AuthModalContextType {
  isOpen: boolean;
  mode: AuthMode;
  openLogin: () => void;
  openSignup: () => void;
  closeModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");

  // Détection des paramètres d'URL (?auth=login ou ?auth=signup) au montage et aux changements d'historique
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkUrlAuth = () => {
      const params = new URLSearchParams(window.location.search);
      const auth = params.get("auth");
      if (auth === "login" || auth === "signin" || auth === "connexion") {
        setMode("login");
        setIsOpen(true);
      } else if (
        auth === "signup" ||
        auth === "register" ||
        auth === "inscription" ||
        auth === "onboarding"
      ) {
        setMode("signup");
        setIsOpen(true);
      }
    };

    checkUrlAuth();
    window.addEventListener("popstate", checkUrlAuth);
    return () => window.removeEventListener("popstate", checkUrlAuth);
  }, []);

  const openLogin = useCallback(() => {
    setMode("login");
    setIsOpen(true);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("auth", "login");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);

  const openSignup = useCallback(() => {
    setMode("signup");
    setIsOpen(true);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("auth", "signup");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("auth")) {
        url.searchParams.delete("auth");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.search ? url.search : "") + url.hash,
        );
      }
    }
  }, []);

  const value = useMemo(
    () => ({ isOpen, mode, openLogin, openSignup, closeModal }),
    [isOpen, mode, openLogin, openSignup, closeModal],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}
