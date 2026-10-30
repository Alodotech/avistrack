"use client";

import { useActionState, useRef, useState } from "react";
import { CalendarIcon, StarIcon } from "@/components/ui/icons";
import { QUESTION_TYPE_LABELS } from "@/lib/review-form";
import type { ReviewFormConfig } from "@/server/domain";
import {
  submitRemark,
  submitReview,
  type PublicReviewState,
} from "./actions";

const inputClass =
  "min-h-11 w-full rounded-lg border border-black/20 bg-white px-3.5 text-sm text-black transition-colors placeholder:text-gray-500 hover:border-black/40 focus:border-black aria-invalid:border-red aria-invalid:ring-1 aria-invalid:ring-red";

const initialState: PublicReviewState = { status: "idle" };

const RATING_VALUES = [1, 2, 3, 4, 5] as const;
const RATING_LABELS = [
  "",
  "Décevant",
  "Moyen",
  "Bien",
  "Très bien",
  "Excellent",
] as const;

function RequiredMark() {
  return (
    <>
      <span aria-hidden className="ml-0.5 text-accent">
        *
      </span>
      <span className="sr-only"> (obligatoire)</span>
    </>
  );
}

function ThankYou({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm sm:p-10">
      <span className="grid size-20 place-items-center rounded-full bg-accent/10 text-accent">
        <svg
          viewBox="0 0 24 24"
          className="size-10"
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
      </span>
      <h1 className="mt-5 text-xl font-semibold text-balance">{title}</h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-gray-600">{message}</p>
    </div>
  );
}

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
  const [mode, setMode] = useState<"welcome" | "review" | "remark">("welcome");
  const [reviewState, reviewAction, reviewPending] = useActionState(
    submitReview,
    initialState,
  );
  const [remarkState, remarkAction, remarkPending] = useActionState(
    submitRemark,
    initialState,
  );
  const [rating, setRating] = useState(0);
  const [focusedRating, setFocusedRating] = useState(1);
  const [reviewerType, setReviewerType] = useState<"anonymous" | "identified">(
    config.allowAnonymous === false ? "identified" : "anonymous",
  );
  const ratingRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (mode === "review" && reviewState.status === "submitted") {
    return (
      <ThankYou title={config.thanksTitle} message={config.thanksMessage} />
    );
  }
  if (mode === "remark" && remarkState.status === "submitted") {
    return (
      <ThankYou
        title="Merci pour votre remarque"
        message="Votre message a bien été transmis à l'entreprise."
      />
    );
  }

  if (mode === "welcome") {
    return (
      <div className="flex flex-col gap-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <header className="flex flex-col gap-2 border-b border-black/10 pb-5">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-gray-600 uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
            {companyName}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="text-sm leading-6 text-gray-600">
            Donnez votre avis sur votre visite, ou laissez-nous une remarque
            libre. Cela prend moins d&apos;une minute.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setMode("review")}
            className="flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep"
          >
            Répondre au formulaire
          </button>
          {config.allowRemarks !== false ? (
            <button
              type="button"
              onClick={() => setMode("remark")}
              className="flex min-h-11 items-center justify-center rounded-full border border-black bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-gray-100"
            >
              Laisser une remarque
            </button>
          ) : null}
        </div>
        <p className="text-center text-xs text-gray-600">
          Le formulaire permet de noter votre visite ; la remarque est un
          message libre, sans note.
        </p>
      </div>
    );
  }

  if (mode === "remark") {
    return (
      <form
        action={remarkAction}
        noValidate
        className="flex flex-col gap-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-8"
      >
        <input type="hidden" name="publicId" value={publicId} />
        <header className="flex flex-col gap-2 border-b border-black/10 pb-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-gray-600 uppercase">
            {companyName}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Laisser une remarque
          </h1>
          <p className="text-sm leading-6 text-gray-600">
            Votre message est transmis directement à l&apos;entreprise.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="remark-first" className="text-sm font-semibold">
              Prénom (facultatif)
            </label>
            <input id="remark-first" name="remarkFirstName" className={inputClass} />
            {remarkState.errors?.remarkFirstName ? (
              <p className="text-sm text-red">{remarkState.errors.remarkFirstName}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="remark-last" className="text-sm font-semibold">
              Nom (facultatif)
            </label>
            <input id="remark-last" name="remarkLastName" className={inputClass} />
            {remarkState.errors?.remarkLastName ? (
              <p className="text-sm text-red">{remarkState.errors.remarkLastName}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="remark-phone" className="text-sm font-semibold">
            Téléphone (facultatif)
          </label>
          <input
            id="remark-phone"
            name="remarkPhone"
            type="tel"
            placeholder="+22901970000"
            className={inputClass}
            aria-describedby="remark-phone-hint"
          />
          <p id="remark-phone-hint" className="text-xs text-gray-600">
            Format international, si vous souhaitez être recontacté.
          </p>
          {remarkState.errors?.remarkPhone ? (
            <p className="text-sm text-red">{remarkState.errors.remarkPhone}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="remark-message" className="text-sm font-semibold">
            Votre remarque
            <RequiredMark />
          </label>
          <textarea
            id="remark-message"
            name="remarkMessage"
            rows={5}
            required
            aria-invalid={Boolean(remarkState.errors?.remarkMessage)}
            className={`${inputClass} min-h-32 resize-y py-3`}
            placeholder="Dites-nous ce qui s'est passé…"
          />
          {remarkState.errors?.remarkMessage ? (
            <p role="alert" className="text-sm text-red">
              {remarkState.errors.remarkMessage}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-black/10 pt-5">
          <button
            type="submit"
            disabled={remarkPending}
            className="min-h-12 w-full cursor-pointer rounded-full bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
          >
            {remarkPending ? "Envoi…" : "Envoyer ma remarque"}
          </button>
          <button
            type="button"
            onClick={() => setMode("welcome")}
            className="text-sm font-semibold text-gray-600 underline underline-offset-4"
          >
            Retour
          </button>
          {remarkState.status === "error" && remarkState.message ? (
            <p role="alert" className="text-center text-sm text-red">
              {remarkState.message}
            </p>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <form
      action={reviewAction}
      noValidate
      className="flex flex-col gap-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-8"
    >
      <input type="hidden" name="publicId" value={publicId} />

      <header className="flex flex-col gap-2 border-b border-black/10 pb-5">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-gray-600 uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          {companyName}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Donnez votre avis</h1>
        <p className="text-sm leading-6 text-gray-600">
          Votre retour aide ce commerce à mieux vous accueillir.
        </p>
      </header>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-black/10 p-4">
        <legend className="px-1 text-sm font-semibold">Votre identité</legend>
        <div className="flex flex-col gap-2">
          {config.allowAnonymous !== false ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="reviewerType"
                value="anonymous"
                checked={reviewerType === "anonymous"}
                onChange={() => setReviewerType("anonymous")}
                className="accent-accent"
              />
              Rester anonyme
            </label>
          ) : null}
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="reviewerType"
              value="identified"
              checked={reviewerType === "identified"}
              onChange={() => setReviewerType("identified")}
              className="accent-accent"
            />
            M&apos;identifier pour être recontacté
          </label>
        </div>

        {reviewerType === "identified" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="reviewer-first" className="text-xs font-semibold">
                Prénom
                <RequiredMark />
              </label>
              <input
                id="reviewer-first"
                name="reviewerFirstName"
                required
                autoComplete="given-name"
                aria-invalid={Boolean(reviewState.errors?.reviewerFirstName)}
                className={inputClass}
              />
              {reviewState.errors?.reviewerFirstName ? (
                <p className="text-sm text-red">
                  {reviewState.errors.reviewerFirstName}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="reviewer-last" className="text-xs font-semibold">
                Nom
                <RequiredMark />
              </label>
              <input
                id="reviewer-last"
                name="reviewerLastName"
                required
                autoComplete="family-name"
                aria-invalid={Boolean(reviewState.errors?.reviewerLastName)}
                className={inputClass}
              />
              {reviewState.errors?.reviewerLastName ? (
                <p className="text-sm text-red">
                  {reviewState.errors.reviewerLastName}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="reviewer-phone" className="text-xs font-semibold">
                Téléphone (facultatif)
              </label>
              <input
                id="reviewer-phone"
                name="reviewerPhone"
                type="tel"
                autoComplete="tel"
                placeholder="+22901970000"
                aria-invalid={Boolean(reviewState.errors?.reviewerPhone)}
                className={inputClass}
              />
              {reviewState.errors?.reviewerPhone ? (
                <p className="text-sm text-red">
                  {reviewState.errors.reviewerPhone}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </fieldset>

      <ol className="flex flex-col gap-4">
        {config.questions.map((question, index) => {
          const error = reviewState.errors?.[question.id];
          const labelId = `q-${question.id}`;
          const isRequired = question.type === "rating" || question.required;

          return (
            <li
              key={question.id}
              className="flex flex-col gap-3 rounded-xl border border-black/10 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-gray-600 uppercase">
                  <span className="grid size-6 place-items-center rounded-full bg-black text-[0.7rem] text-white">
                    {index + 1}
                  </span>
                  {QUESTION_TYPE_LABELS[question.type]}
                </span>
                {!isRequired ? (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[0.7rem] font-semibold text-gray-600">
                    Facultatif
                  </span>
                ) : null}
              </div>

              {question.type === "rating" ? (
                <fieldset className="flex flex-col gap-3 border-0 p-0">
                  <legend id={labelId} className="text-base font-semibold text-balance">
                    {question.label}
                    <RequiredMark />
                  </legend>
                  <input type="hidden" name={question.id} value={rating || ""} />
                  <div
                    className="flex flex-wrap items-center gap-1"
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
                            } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
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
                          className={`grid size-11 cursor-pointer place-items-center rounded-full transition duration-150 hover:scale-110 ${
                            active ? "text-accent" : "text-gray-500 hover:text-accent"
                          }`}
                        >
                          <StarIcon filled={active} className="size-8" />
                        </button>
                      );
                    })}
                  </div>
                  <p aria-live="polite" className="min-h-5 text-sm text-gray-600">
                    {rating > 0
                      ? `${rating} / 5 · ${RATING_LABELS[rating]}`
                      : "Sélectionnez une note en touchant une étoile."}
                  </p>
                  {error ? (
                    <p role="alert" className="text-sm font-medium text-red">
                      {error}
                    </p>
                  ) : null}
                </fieldset>
              ) : null}

              {question.type === "date" ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor={labelId} className="text-base font-semibold text-balance">
                    {question.label}
                    {isRequired ? <RequiredMark /> : null}
                  </label>
                  <div className="relative">
                    <CalendarIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-600" />
                    <input
                      id={labelId}
                      type="date"
                      name={question.id}
                      max={maxDate}
                      required={question.required}
                      aria-invalid={Boolean(error)}
                      className={`${inputClass} pl-11`}
                    />
                  </div>
                  {error ? (
                    <p role="alert" className="text-sm font-medium text-red">
                      {error}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {question.type === "text" ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor={labelId} className="text-base font-semibold text-balance">
                    {question.label}
                    {isRequired ? <RequiredMark /> : null}
                  </label>
                  <textarea
                    id={labelId}
                    name={question.id}
                    rows={3}
                    required={question.required}
                    placeholder="Partagez votre expérience…"
                    aria-invalid={Boolean(error)}
                    className={`${inputClass} min-h-24 resize-y py-3`}
                  />
                  {error ? (
                    <p role="alert" className="text-sm font-medium text-red">
                      {error}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 border-t border-black/10 pt-5">
        <button
          type="submit"
          disabled={reviewPending}
          className="min-h-12 w-full cursor-pointer rounded-full bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {reviewPending ? "Envoi…" : "Envoyer mon avis"}
        </button>
        <button
          type="button"
          onClick={() => setMode("welcome")}
          className="text-sm font-semibold text-gray-600 underline underline-offset-4"
        >
          Retour
        </button>
        {reviewState.status === "error" && reviewState.message ? (
          <p role="alert" className="text-center text-sm font-medium text-red">
            {reviewState.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
