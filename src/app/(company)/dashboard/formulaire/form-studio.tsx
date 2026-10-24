"use client";

import { useActionState, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  StarIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { Panel } from "@/components/ui/panel";
import {
  MAX_FORM_QUESTIONS,
  newQuestionId,
  QUESTION_TYPE_HINTS,
  QUESTION_TYPE_LABELS,
} from "@/lib/review-form";
import type {
  QuestionType,
  ReviewFormConfig,
  ReviewFormQuestion,
} from "@/server/domain";
import { saveFormConfig, type FormStudioState } from "./actions";

const inputClass =
  "min-h-11 w-full rounded-lg border border-black/20 bg-white px-3 text-sm transition-colors hover:border-black/40 focus:border-black aria-invalid:border-red aria-invalid:ring-1 aria-invalid:ring-red";

const initialState: FormStudioState = { status: "idle" };

const ADDABLE_TYPES: QuestionType[] = ["text", "date"];

export function FormStudio({
  config,
  companyName,
}: {
  config: ReviewFormConfig;
  companyName: string;
}) {
  const [state, action, pending] = useActionState(saveFormConfig, initialState);
  const [questions, setQuestions] = useState<ReviewFormQuestion[]>(
    config.questions,
  );
  const [thanksTitle, setThanksTitle] = useState(config.thanksTitle);
  const [thanksMessage, setThanksMessage] = useState(config.thanksMessage);
  const [view, setView] = useState<"form" | "thanks">("form");
  const [attempted, setAttempted] = useState(false);
  const labelRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isLabelInvalid = (question: ReviewFormQuestion) =>
    question.label.trim().length < 2;

  /*
   * Le serveur revalide tout : ce garde-fou évite seulement un aller-retour
   * réseau et garde le focus sur la première question incomplète.
   */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    setAttempted(true);
    const firstInvalid = questions.find(isLabelInvalid);
    if (firstInvalid) {
      event.preventDefault();
      labelRefs.current[firstInvalid.id]?.focus();
    }
  };

  const updateQuestion = (id: string, patch: Partial<ReviewFormQuestion>) =>
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    );

  const removeQuestion = (id: string) =>
    setQuestions((current) => current.filter((question) => question.id !== id));

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    setQuestions((current) => {
      const newQuestions = [...current];
      const [moved] = newQuestions.splice(fromIndex, 1);
      newQuestions.splice(toIndex, 0, moved);
      return newQuestions;
    });
  };

  const addQuestion = () => {
    if (questions.length >= MAX_FORM_QUESTIONS) return;
    setQuestions((current) => [
      ...current,
      { id: newQuestionId(), type: "text", label: "", required: false },
    ]);
  };

  const canAdd = questions.length < MAX_FORM_QUESTIONS;

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      className="grid items-start gap-6 lg:gap-8 xl:grid-cols-2"
      noValidate
    >
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />

      <Panel
        id="questions"
        title="Questions du formulaire"
        description={`Composez jusqu'à ${MAX_FORM_QUESTIONS} questions. La note par étoiles reste toujours présente.`}
      >
        <div className="flex flex-col gap-6">
          <p className="text-sm text-gray-600">
            {questions.length} / {MAX_FORM_QUESTIONS} question
            {questions.length > 1 ? "s" : ""}
          </p>

          <ol className="flex flex-col gap-4">
            {questions.map((question, index) => {
              const isRating = question.type === "rating";
              return (
                <li
                  key={question.id}
                  className="flex flex-col gap-4 rounded-lg border border-black/15 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      <span className="grid size-6 place-items-center rounded-full bg-black text-[0.7rem] text-white">
                        {index + 1}
                      </span>
                      {QUESTION_TYPE_LABELS[question.type]}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveQuestion(index, index - 1)}
                        disabled={index === 0}
                        aria-label={`Monter la question ${index + 1}`}
                        title="Monter d'une position"
                        className="grid size-10 cursor-pointer place-items-center rounded-full border border-black/15 text-black transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUpIcon className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(index, index + 1)}
                        disabled={index === questions.length - 1}
                        aria-label={`Descendre la question ${index + 1}`}
                        title="Descendre d'une position"
                        className="grid size-10 cursor-pointer place-items-center rounded-full border border-black/15 text-black transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDownIcon className="size-4" />
                      </button>

                      {isRating ? (
                        <span className="ml-1 rounded-full bg-gray-100 px-2.5 py-1 text-[0.7rem] font-semibold text-gray-600">
                          Toujours incluse
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          aria-label={`Supprimer la question ${index + 1}`}
                          className="ml-1 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-red transition-colors hover:bg-red/10"
                        >
                          <TrashIcon className="size-4" />
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <label
                        htmlFor={`label-${question.id}`}
                        className="text-sm font-semibold"
                      >
                        Question posée au client
                        {isRating ? (
                          <span className="ml-0.5 text-accent">*</span>
                        ) : null}
                      </label>
                      <span className="text-xs text-gray-500">
                        {question.label.length}/140
                      </span>
                    </div>
                    <input
                      ref={(node) => {
                        labelRefs.current[question.id] = node;
                      }}
                      id={`label-${question.id}`}
                      value={question.label}
                      onChange={(event) =>
                        updateQuestion(question.id, { label: event.target.value })
                      }
                      maxLength={140}
                      placeholder="Ex. Qu'avez-vous pensé de l'accueil ?"
                      aria-invalid={
                        attempted && isLabelInvalid(question) ? true : undefined
                      }
                      className={inputClass}
                    />
                    {attempted && isLabelInvalid(question) ? (
                      <p role="alert" className="text-sm text-red">
                        Saisissez une question d&apos;au moins 2 caractères.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-4">
                    {isRating ? (
                      <p className="text-xs text-gray-600">
                        {QUESTION_TYPE_HINTS.rating}
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor={`type-${question.id}`}
                          className="text-xs font-semibold text-gray-600"
                        >
                          Type de réponse
                        </label>
                        <select
                          id={`type-${question.id}`}
                          value={question.type}
                          onChange={(event) =>
                            updateQuestion(question.id, {
                              type: event.target.value as QuestionType,
                            })
                          }
                          className="min-h-10 rounded-md border border-black/30 bg-white px-2 text-sm"
                        >
                          {ADDABLE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {QUESTION_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isRating ? (
                      <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(event) =>
                            updateQuestion(question.id, {
                              required: event.target.checked,
                            })
                          }
                          className="size-4 accent-accent"
                        />
                        Réponse obligatoire
                      </label>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>

          {state.errors?.questions ? (
            <p role="alert" className="text-sm text-red">
              {state.errors.questions}
            </p>
          ) : null}

          <button
            type="button"
            onClick={addQuestion}
            disabled={!canAdd}
            className={buttonClass("secondary", "self-start disabled:opacity-50")}
          >
            + Ajouter une question
          </button>
        </div>
      </Panel>

      <div className="flex flex-col gap-6 lg:gap-8">
        <Panel
          id="remerciement"
          title="Écran de remerciement"
          description="Ce que voit le client après l'envoi de son avis."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="thanksTitle" className="text-sm font-semibold">
                Titre
              </label>
              <input
                id="thanksTitle"
                name="thanksTitle"
                value={thanksTitle}
                onChange={(event) => setThanksTitle(event.target.value)}
                maxLength={80}
                aria-invalid={Boolean(state.errors?.thanksTitle)}
                className={inputClass}
              />
              {state.errors?.thanksTitle ? (
                <p className="text-sm text-red">{state.errors.thanksTitle}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="thanksMessage" className="text-sm font-semibold">
                Message
              </label>
              <textarea
                id="thanksMessage"
                name="thanksMessage"
                value={thanksMessage}
                onChange={(event) => setThanksMessage(event.target.value)}
                rows={3}
                maxLength={240}
                aria-invalid={Boolean(state.errors?.thanksMessage)}
                className={`${inputClass} min-h-20 resize-y py-2.5`}
              />
              {state.errors?.thanksMessage ? (
                <p className="text-sm text-red">{state.errors.thanksMessage}</p>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel
          id="apercu"
          title="Aperçu"
          description="Le formulaire tel qu'il apparaîtra sur le téléphone du client."
          actions={<ViewTabs view={view} onChange={setView} />}
        >
          <div className="py-2">
            {view === "form" ? (
              <FormPreview
                companyName={companyName}
                questions={questions}
              />
            ) : (
              <ThanksPreview
                companyName={companyName}
                title={thanksTitle}
                message={thanksMessage}
              />
            )}
          </div>
        </Panel>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer le formulaire"}
          </Button>
          <p
            role="status"
            className={`text-sm ${state.status === "error" ? "text-red" : ""}`}
          >
            {state.message}
          </p>
        </div>
      </div>
    </form>
  );
}

function ViewTabs({
  view,
  onChange,
}: {
  view: "form" | "thanks";
  onChange: (view: "form" | "thanks") => void;
}) {
  const options = [
    { id: "form", label: "Formulaire" },
    { id: "thanks", label: "Remerciement" },
  ] as const;

  return (
    <div
      role="group"
      aria-label="Écran affiché dans l'aperçu"
      className="inline-flex rounded-full border border-black/15 p-1"
    >
      {options.map((option) => {
        const active = view === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={`min-h-11 cursor-pointer rounded-full px-3 text-sm font-semibold transition-colors ${
              active ? "bg-black text-white" : "text-gray-600 hover:text-black"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="rounded-[2.25rem] border border-black/15 bg-black p-2.5 shadow-sm">
        <div className="flex flex-col gap-5 rounded-[1.75rem] bg-white px-5 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span className="text-xs font-semibold text-black">
      {children || <span className="text-gray-600">Question sans intitulé</span>}
      {required ? (
        <span aria-hidden className="ml-0.5 text-accent">
          *
        </span>
      ) : null}
    </span>
  );
}

function FormPreview({
  companyName,
  questions,
}: {
  companyName: string;
  questions: ReviewFormQuestion[];
}) {
  return (
    <PhoneFrame>
      <p className="text-center text-xs font-semibold tracking-wide text-gray-600 uppercase">
        {companyName}
      </p>

      {questions.map((question) => {
        if (question.type === "rating") {
          return (
            <div key={question.id} className="flex flex-col items-center gap-3">
              <p className="text-center text-lg leading-snug font-semibold">
                {question.label}
              </p>
              <div className="flex justify-center gap-1 text-accent" aria-hidden>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} filled className="size-7" />
                ))}
              </div>
            </div>
          );
        }
        if (question.type === "date") {
          return (
            <div key={question.id} className="flex flex-col gap-1">
              <FieldLabel required={question.required}>
                {question.label}
              </FieldLabel>
              <div className="flex min-h-10 items-center justify-between rounded-md border border-black/20 px-3 text-xs text-gray-600">
                <span>jj/mm/aaaa</span>
                <CalendarIcon className="size-4" />
              </div>
            </div>
          );
        }
        return (
          <div key={question.id} className="flex flex-col gap-1">
            <FieldLabel required={question.required}>
              {question.label}
            </FieldLabel>
            <div className="h-16 rounded-md border border-black/20 bg-gray-100" />
          </div>
        );
      })}

      <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-white">
        Envoyer mon avis
      </span>
    </PhoneFrame>
  );
}

function ThanksPreview({
  companyName,
  title,
  message,
}: {
  companyName: string;
  title: string;
  message: string;
}) {
  return (
    <PhoneFrame>
      <p className="text-center text-xs font-semibold tracking-wide text-gray-600 uppercase">
        {companyName}
      </p>
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <svg
          viewBox="0 0 24 24"
          className="size-14 text-accent"
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
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-sm leading-6 text-gray-600">{message}</p>
      </div>
    </PhoneFrame>
  );
}
