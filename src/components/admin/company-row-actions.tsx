import {
  changeCompanyStatusAction,
  deleteCompanyAction,
} from "@/app/(admin)/admin/actions";
import type { CompanyStatus } from "@/server/domain";
import { ConfirmDialog } from "./confirm-dialog";

export function CompanyRowActions({
  id,
  name,
  status,
}: {
  id: string;
  name: string;
  status: CompanyStatus;
}) {
  return (
    <div className="flex items-center gap-2">
      {status === "ACTIVE" ? (
        <ConfirmDialog
          triggerLabel="Suspendre"
          triggerContext={name}
          title={`Suspendre ${name} ?`}
          description="L'entreprise ne pourra plus se connecter et son formulaire public n'acceptera plus d'avis. Ses données sont conservées et son QR code restera valide après réactivation."
          confirmLabel="Suspendre"
          action={changeCompanyStatusAction}
          fields={{ companyId: id, change: "SUSPEND" }}
        />
      ) : null}
      {status === "SUSPENDED" ? (
        <ConfirmDialog
          triggerLabel="Réactiver"
          triggerContext={name}
          title={`Réactiver ${name} ?`}
          description="L'entreprise retrouvera l'accès à son tableau de bord et son formulaire public redeviendra disponible, avec le même QR code."
          confirmLabel="Réactiver"
          action={changeCompanyStatusAction}
          fields={{ companyId: id, change: "REACTIVATE" }}
        />
      ) : null}
      <ConfirmDialog
        triggerLabel="Supprimer"
        triggerContext={name}
        title={`Supprimer ${name} ?`}
        description="Le compte est désactivé immédiatement et disparaît de cette liste. Ses données, avis compris, seront purgées définitivement au bout de 30 jours."
        confirmLabel="Supprimer définitivement"
        destructive
        action={deleteCompanyAction}
        fields={{ companyId: id }}
        typedConfirmation={name}
      />
    </div>
  );
}
