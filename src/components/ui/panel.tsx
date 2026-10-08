import type { ReactNode } from "react";

/** En-tête de page : titre, phrase d'accompagnement, actions éventuelles à droite. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-gray-600">{description}</p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}

/**
 * Bloc de contenu sur fond blanc. `flush` retire la marge intérieure du corps,
 * pour qu'un tableau aille d'un bord à l'autre.
 */
export function Panel({
  id,
  title,
  description,
  actions,
  flush = false,
  className = "",
  children,
}: {
  /** Sert d'ancre et relie la section à son titre. */
  id: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const titleId = `${id}-title`;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={`flex flex-col rounded-lg border border-black/15 bg-white ${className}`}
    >
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-black/10 px-5 py-4 lg:px-6 lg:py-5">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-gray-600">{description}</p>
          ) : null}
        </div>
        {actions}
      </header>
      <div className={`flex flex-1 flex-col ${flush ? "" : "p-5 lg:p-6"}`}>
        {children}
      </div>
    </section>
  );
}

/** Message d'état vide ou d'information à l'intérieur d'un bloc. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="m-5 rounded-md bg-gray-100 p-5 text-sm leading-6 lg:m-6">
      {children}
    </p>
  );
}
