import "server-only";
import { getStore } from "@/server/dev/memory-store";
import type { Admin } from "@/server/domain";

export async function findAdminById(id: string): Promise<Admin | null> {
  return getStore().admins.find((admin) => admin.id === id) ?? null;
}

export async function findAdminByEmail(email: string): Promise<Admin | null> {
  const needle = email.trim().toLowerCase();
  return (
    getStore().admins.find(
      (admin) => admin.email.toLowerCase() === needle,
    ) ?? null
  );
}
