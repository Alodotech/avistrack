"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyIcon } from "@/components/ui/icons";

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
    <>
      <Button type="button" variant="secondary" onClick={copy}>
        <CopyIcon />
        {state === "copied" ? "Lien copié" : "Copier le lien"}
      </Button>
      <span role="status" className="sr-only">
        {state === "copied" ? "Lien copié dans le presse-papiers." : null}
      </span>
      {state === "failed" ? (
        <p role="alert" className="text-xs text-red">
          Copie impossible : sélectionnez le lien pour le copier.
        </p>
      ) : null}
    </>
  );
}
