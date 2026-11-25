"use client";

import { useEffect, useRef } from "react";

/** Canvas présent dès le HTML ; le moteur WebGL est chargé juste après. */
export function Scene3DCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dispose: (() => void) | undefined;
    let cancelled = false;

    void import("./scene3d").then(({ mountScene }) => {
      if (cancelled) return;
      dispose = mountScene(canvas, document.documentElement);
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="scene-canvas" />;
}
