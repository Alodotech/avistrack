import { LoadingScreen } from "@/components/ui/loading-screen";

/** Page de chargement globale : s'affiche pendant la préparation d'une route. */
export default function Loading() {
  return <LoadingScreen label="Chargement d'AvisTrack" />;
}
