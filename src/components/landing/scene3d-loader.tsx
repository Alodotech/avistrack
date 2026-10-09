"use client";

import dynamic from "next/dynamic";

const Scene3D = dynamic(() => import("./scene3d").then((m) => m.Scene3D), {
  ssr: false,
  loading: () => <span className="sr-only">Chargement de la scène</span>,
});

/** Point d'entrée client de la scène WebGL (chargée en différé). */
export function Scene3DLoader() {
  return <Scene3D />;
}