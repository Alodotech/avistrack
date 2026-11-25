"use client";

import type { FormEvent } from "react";
import { buttonClass } from "@/components/ui/button";

const inputClass =
  "min-h-11 w-full rounded-lg border border-white/15 bg-black/20 px-3.5 text-sm text-white transition-colors placeholder:text-white/50 hover:border-white/30 focus:border-accent focus:bg-white/5 focus:outline-none focus:ring-2 focus:ring-accent/25";

export function ContactForm() {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const subject = encodeURIComponent(`Contact AvisTrack — ${name}`);
    const body = encodeURIComponent(
      `Nom : ${name}\nTéléphone : ${phone}\n\n${message}`,
    );

    window.location.href = `mailto:contact@avistrack.org?subject=${subject}&body=${body}`;
  };

  return (
    <section
      aria-labelledby="footer-contact-title"
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-5 shadow-2xl shadow-black/20 sm:p-6"
    >
      <p className="text-[0.65rem] font-bold tracking-[0.16em] text-accent uppercase">
        Contact
      </p>
      <h2
        id="footer-contact-title"
        className="mt-2 text-lg font-semibold tracking-tight sm:text-xl"
      >
        Parlons de votre projet
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-white/60">
        Votre messagerie s&apos;ouvrira avec le message prérempli. Vous pourrez
        l&apos;envoyer depuis votre application de messagerie.
      </p>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-5 grid gap-4 sm:grid-cols-2"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-name" className="text-sm font-medium">
            Votre nom
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            placeholder="Prénom et nom"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-phone" className="text-sm font-medium">
            Votre numéro
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            required
            minLength={8}
            maxLength={20}
            autoComplete="tel"
            inputMode="tel"
            placeholder="+229 01 97 00 00"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="contact-message" className="text-sm font-medium">
            Votre message
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            placeholder="Dites-nous comment nous pouvons vous aider."
            className={`${inputClass} min-h-32 resize-y py-3`}
          />
        </div>

        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            className={buttonClass("primary", "w-full")}
          >
            Envoyer
          </button>
        </div>
      </form>
    </section>
  );
}
