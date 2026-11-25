import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

const ACCOUNT_DELETION_BATCH_SIZE = 50;

export type CompanyDataPurgeResult = {
  manuallyDeletedCompanies: number;
  expiredCompanies: number;
  deletedAccounts: number;
  failedAccounts: number;
};

export async function purgeCompanyData(): Promise<CompanyDataPurgeResult> {
  const supabase = createAdminClient();
  const { data: manuallyDeleted, error: deletedError } = await supabase.rpc(
    "purge_deleted_companies",
    { p_retention_days: 30 },
  );
  if (deletedError) {
    throw new Error("Failed to purge manually deleted companies.", {
      cause: deletedError,
    });
  }

  const { data: expired, error: expiredError } = await supabase.rpc(
    "purge_expired_companies",
    { p_inactive_days: 90 },
  );
  if (expiredError) {
    throw new Error("Failed to purge expired companies.", {
      cause: expiredError,
    });
  }

  const { data: queuedAccounts, error: queueError } = await supabase
    .from("account_deletion_queue")
    .select("user_id")
    .order("queued_at", { ascending: true })
    .limit(ACCOUNT_DELETION_BATCH_SIZE);
  if (queueError) {
    throw new Error("Failed to read the account deletion queue.", {
      cause: queueError,
    });
  }

  let deletedAccounts = 0;
  let failedAccounts = 0;
  for (const account of queuedAccounts) {
    const { error } = await supabase.auth.admin.deleteUser(account.user_id);
    if (error) {
      failedAccounts += 1;
      console.error(
        `[company-data-purge] Failed to delete queued account ${account.user_id}.`,
        error,
      );
    } else {
      deletedAccounts += 1;
    }
  }

  return {
    manuallyDeletedCompanies: manuallyDeleted ?? 0,
    expiredCompanies: expired ?? 0,
    deletedAccounts,
    failedAccounts,
  };
}
