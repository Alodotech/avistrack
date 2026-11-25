import { buttonClass } from "@/components/ui/button";
import { DownloadIcon } from "@/components/ui/icons";
import type { ReportPeriod } from "@/server/repositories/platform-report-repository";

/**
 * Les exports passent par les routes serveur protégées : chacun est journalisé
 * dans `report_downloads`, y compris Excel. Ce sont de simples liens, les
 * exports fonctionnent donc sans JavaScript.
 */
export function PlatformReportExportButtons({
  period,
  year,
  month,
}: {
  period: ReportPeriod;
  year: number;
  month: number;
}) {
  const query = new URLSearchParams({
    type: period,
    annee: String(year),
    mois: String(month),
  });
  const pdfHref = `/api/admin/rapport?${query.toString()}`;
  const excelHref = `/api/admin/rapport/excel?${query.toString()}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={pdfHref} className={buttonClass("secondary", "", "sm")}>
        <DownloadIcon />
        Rapport PDF
      </a>
      <a href={excelHref} className={buttonClass("secondary", "", "sm")}>
        <DownloadIcon />
        Rapport Excel
      </a>
    </div>
  );
}
