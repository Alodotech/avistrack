import type { CompanyStatus, SerializedSubscription } from "@/server/domain";
import { DeleteCompanyModal } from "./delete-company-modal";
import { SuspendCompanyModal } from "./suspend-company-modal";
import { ViewSubscriptionModal } from "./view-subscription-modal";

export function CompanyRowActions({
  id,
  name,
  status,
  createdAt,
  subscription,
}: {
  id: string;
  name: string;
  status: CompanyStatus;
  createdAt: string | Date;
  subscription?: SerializedSubscription;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {/* 1. Crayon : Suspendre / gérer le statut avec date de suspension */}
      <SuspendCompanyModal companyId={id} name={name} status={status} />

      {/* 2. Poubelle : Supprimer avec modal de confirmation */}
      <DeleteCompanyModal companyId={id} name={name} />

      {/* 3. Carte bancaire : Vérifier l'abonnement (jour d'abonnement et de fin) */}
      <ViewSubscriptionModal
        companyId={id}
        name={name}
        createdAt={createdAt}
        subscription={subscription}
      />
    </div>
  );
}
