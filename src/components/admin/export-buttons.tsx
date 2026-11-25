"use client";

import { useState } from "react";
import { fetchCompaniesForExport } from "@/app/(admin)/admin/entreprises/actions";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "@/components/ui/icons";
import type { CompanyFilters } from "@/lib/company-filters";
import {
  describeCompanyFilters,
  describeCompanyStatus,
} from "@/lib/company-filters";
import { exportCompaniesExcel } from "@/lib/export-excel";
import { exportCompaniesPDF } from "@/lib/export-pdf";

type Pending = "pdf" | "excel" | null;

/**
 * Boutons d'export de la liste administrative (T33, T34).
 *
 * Les lignes sont relues par une Server Action : l'export porte toujours sur
 * l'ensemble du résultat filtré, et non sur la seule page affichée. Les
 * fichiers sont ensuite produits dans le navigateur : aucun secret n'est
 * exposé au client.
 */
export function ExportButtons({ filters }: { filters: CompanyFilters }) {
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);

  const meta = {
    period: describeCompanyFilters(filters),
    status: describeCompanyStatus(filters),
    search: filters.search,
  };

  async function run(kind: Exclude<Pending, null>) {
    setPending(kind);
    setError(null);
    try {
      const companies = await fetchCompaniesForExport(filters);
      if (kind === "pdf") {
        await exportCompaniesPDF(companies, meta);
      } else {
        await exportCompaniesExcel(companies, meta);
      }
    } catch {
      setError("L'export a échoué. Réessayez dans un instant.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending !== null}
        onClick={() => run("pdf")}
      >
        <DownloadIcon />
        {pending === "pdf" ? "Génération…" : "Exporter en PDF"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending !== null}
        onClick={() => run("excel")}
      >
        <DownloadIcon />
        {pending === "excel" ? "Génération…" : "Exporter en Excel"}
      </Button>
      <p role="alert" className="text-sm text-red">
        {error}
      </p>
    </div>
  );
}
