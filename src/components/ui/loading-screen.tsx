/**
 * Écran de chargement de l'application. Purement décoratif et sans script :
 * il s'affiche pendant qu'une route se prépare, puis disparaît. Le texte porte
 * l'information, la rotation ne fait que rassurer.
 */
export function LoadingScreen({
  label = "Chargement",
  fullHeight = true,
}: {
  label?: string;
  fullHeight?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`grid w-full place-items-center px-6 py-24 ${
        fullHeight ? "min-h-dvh" : "min-h-[60vh]"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <span className="loading-ring" aria-hidden />
        <p className="text-sm text-gray-600">{label}…</p>
        <span className="loading-bar" aria-hidden />
      </div>
    </div>
  );
}
