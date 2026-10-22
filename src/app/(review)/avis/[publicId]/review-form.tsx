"use client";

import { useActionState, useRef, useState } from "react";
import { CalendarIcon, StarIcon } from "@/components/ui/icons";
import type { ReviewFormConfig } from "@/server/domain";
import { submitReview, type PublicReviewState } from "./actions";

const inputClass =
  "min-h-11 w-full rounded-md border border-black/30 bg-white px-3 text-sm aria-invalid:border-red";

const initialState: PublicReviewState = { status: "idle" };

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

export function ReviewForm({
  companyName,
  publicId,
  config,
  maxDate,
}: {
  companyName: string;
  publicId: string;
  config: ReviewFormConfig;
  maxDate: string;
}) {
  const [state, action, pending] = useActionState(submitReview, initialState);
  const [rating, setRating] = useState(0);
  /*
   * `focusedRating` porte le tabindex glissant (« roving tabindex ») : seul
   * l' étoile courante est atteignable au Tab, les flèches clavier changent
   * d'étoile. Sans cela, un lecteur d'écran ou un clavier doit parcourir les
   * cinq boutons.
   */
  const [focusedRating, setFocusedRating] = useState(1);
  const ratingRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (state.status === "submitted") {
    return (
      <div className="rounded-2xl border border-black/15 bg-white p-8 text-center">
        <svg
          viewBox="0 0 24 24"
          className="mx-auto size-16 text-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </svg>
        <h1 className="mt-5 text-xl font-semibold">{config.thanksTitle}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {config.thanksMessage}
        </p>
      </div>
    );
  }

  return (
    <form
      action={action}
      noValidate
      className="flex flex-col gap-6 rounded-2xl border border-black/15 bg-white p-6 sm:p-8"
    >
      <input type="hidden" name="publicId" value={publicId} />

      <header className="flex flex-col gap-1 border-b border-black/15 pb-5">
        <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
          {companyName}
        </p>
        <h1 className="text-xl font-semibold">Donnez votre avis</h1>
      </header>

      {config.questions.map((question) => {
        const error = state.errors?.[question.id];
        const labelId = `q-${question.id}`;

        if (question.type === "rating") {
          return (
            <fieldset key={question.id} className="flex flex-col gap-3">
              <legend
                id={labelId}
                className="text-base font-semibold text-balance"
              >
                {question.label}
              </legend>
              <input type="hidden" name={question.id} value={rating || ""} />
              <div
                className="flex gap-2"
                role="radiogroup"
                aria-labelledby={labelId}
              >
                {RATING_VALUES.map((value) => {
                  const active = value <= rating;
                  return (
                    <button
                      key={value}
                      ref={(node) => {
                        ratingRefs.current[value - 1] = node;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
                      tabIndex={focusedRating === value ? 0 : -1}
                      onClick={() => {
                        setRating(value);
                        setFocusedRating(value);
                      }}
                      onFocus={() => setFocusedRating(value)}
                      onKeyDown={(event) => {
                        let next = focusedRating;
                        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                          next = Math.min(RATING_VALUES.length, focusedRating + 1);
                        } else if (
                          event.key === "ArrowLeft" ||
                          event.key === "ArrowDown"
                        ) {
                          next = Math.max(1, focusedRating - 1);
                        } else if (event.key === "Home") {
                          next = 1;
                        } else if (event.key === "End") {
                          next = RATING_VALUES.length;
                        } else {
                          return;
                        }
                        event.preventDefault();
                        setFocusedRating(next);
                        setRating(next);
                        ratingRefs.current[next - 1]?.focus();
                      }}
                      className={`grid size-11 cursor-pointer place-items-center rounded-full border transition-colors ${
                        active
                          ? "border-accent text-accent"
                          : "border-black/20 text-gray-600 hover:border-black/40"
                      }`}
                    >
                      <StarIcon filled={active} className="size-6" />
                    </button>
                  );
                })}
              </div>
              {error ? (
                <p role="alert" className="text-sm text-red">
                  {error}
                </p>
              ) : null}
            </fieldset>
          );
        }

        if (question.type === "date") {
          return (
            <div key={question.id} className="flex flex-col gap-1">
              <label htmlFor={labelId} className="text-base font-semibold">
                {question.label}
              </label>
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-5 text-gray-600" />
                <input
                  id={labelId}
                  type="date"
                  name={question.id}
                  max={maxDate}
                  aria-invalid={Boolean(error)}
                  className={inputClass}
                />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-red">
                  {error}
                </p>
              ) : null}
            </div>
          );
        }

        return (
          <div key={question.id} className="flex flex-col gap-1">
            <label htmlFor={labelId} className="text-base font-semibold">
              {question.label}
            </label>
            <textarea
              id={labelId}
              name={question.id}
              rows={4}
              aria-invalid={Boolean(error)}
              className={`${inputClass} min-h-24 resize-y py-2.5`}
            />
            {error ? (
              <p role="alert" className="text-sm text-red">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}

      <div className="flex flex-col gap-3 border-t border-black/15 pt-5">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-full bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
        >
          {pending ? "Envoi…" : "Envoyer mon avis"}
        </button>
        {state.status === "error" && state.message ? (
          <p role="alert" className="text-sm text-red">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
