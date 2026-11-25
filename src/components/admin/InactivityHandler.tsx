"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";

/** Au-delà de ce délai sans action de l'utilisateur, la session est fermée. */
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

/** Intervalle de vérification : la session peut expirer entre deux actions. */
const CHECK_INTERVAL = 60 * 1000;

/**
 * Fréquence minimale de reprogrammation du minuteur d'inactivité.
 *
 * `mousemove` peut être émis plusieurs centaines de fois par seconde :
 * reprogrammer le minuteur à chaque mouvement serait du travail inutile.
 * L'horodatage de la dernière activité, lui, est mis à jour à chaque
 * événement — c'est lui qui fait foi.
 */
const RESCHEDULE_THROTTLE = 1000;

/**
 * Déconnexion automatique après 15 minutes d'inactivité (T35).
 *
 * Le composant enveloppe la page : il la rend, et surveille l'activité en
 * parallèle. À l'expiration du délai, la session Supabase est fermée côté
 * navigateur, puis l'utilisateur est renvoyé vers la page de connexion.
 */
export function InactivityHandler({
  redirectTo,
  children,
}: {
  redirectTo: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let lastSchedule = 0;

    function schedule() {
      if (timerRef.current) clearTimeout(timerRef.current);
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, INACTIVITY_TIMEOUT - elapsed);
      timerRef.current = setTimeout(expire, remaining);
      lastSchedule = Date.now();
    }

    function expire() {
      /*
       * Le minuteur n'est qu'un déclencheur approximatif : la décision est
       * prise sur l'horodatage réel de la dernière activité. Si l'utilisateur
       * a été actif entre-temps, on reprogramme au lieu de fermer la session.
       */
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed < INACTIVITY_TIMEOUT) {
        schedule();
        return;
      }
      setExpired(true);
      // La session est fermée côté client : le cookie d'authentification
      // disparaît, la protection des routes serveur s'applique ensuite.
      void createClient()
        .auth.signOut()
        .finally(() => router.replace(redirectTo));
    }

    function markActivity() {
      lastActivityRef.current = Date.now();
      if (Date.now() - lastSchedule < RESCHEDULE_THROTTLE) return;
      schedule();
    }

    markActivity();
    lastSchedule = Date.now();

    window.addEventListener("mousemove", markActivity, { passive: true });
    window.addEventListener("keydown", markActivity);
    window.addEventListener("click", markActivity);
    window.addEventListener("scroll", markActivity, { passive: true });
    document.addEventListener("visibilitychange", markActivity);

    const interval = setInterval(schedule, CHECK_INTERVAL);

    return () => {
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("click", markActivity);
      window.removeEventListener("scroll", markActivity);
      document.removeEventListener("visibilitychange", markActivity);
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(interval);
    };
  }, [redirectTo, router]);

  return (
    <>
      {children}
      {expired ? (
        <p
          role="status"
          className="sr-only"
          aria-live="polite"
        >
          Votre session a été fermée après 15 minutes d&apos;inactivité.
        </p>
      ) : null}
    </>
  );
}
