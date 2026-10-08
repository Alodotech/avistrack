"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ value }: { value: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="secondary" onClick={copy}>
        Copier le lien
      </Button>
      <p role="status" className="min-h-5 text-xs text-gray-600">
        {state === "copied" ? "Lien copié." : null}
        {state === "failed"
          ? "Copie impossible : sélectionnez le lien pour le copier."
          : null}
      </p>
    </div>
  );
}
