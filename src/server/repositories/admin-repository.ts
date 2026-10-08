import "server-only";
import { getStore } from "@/server/dev/memory-store";
import type { Admin } from "@/server/domain";

export async function findAdminById(id: string): Promise<Admin | null> {
  return getStore().admins.find((admin) => admin.id === id) ?? null;
}
