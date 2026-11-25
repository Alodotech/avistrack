import "server-only";
import { createAdminClient } from "@/utils/supabase/admin";

export const COMPANY_LOGO_MAX_BYTES = 700 * 1024;

const COMPANY_LOGO_BUCKET = "company-logos";

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type CompanyLogoUploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export async function uploadCompanyLogo(
  companyId: string,
  file: File,
): Promise<CompanyLogoUploadResult> {
  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return {
      ok: false,
      message: "Le logo doit être une image PNG, JPG ou WebP.",
    };
  }
  if (file.size > COMPANY_LOGO_MAX_BYTES) {
    return {
      ok: false,
      message: "Le logo ne doit pas dépasser 700 Ko.",
    };
  }

  const supabase = createAdminClient();
  const path = `${companyId}/logo-${globalThis.crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(COMPANY_LOGO_BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    return {
      ok: false,
      message: "Le logo n'a pas pu être envoyé. Réessayez avec un autre fichier.",
    };
  }

  const { data } = supabase.storage
    .from(COMPANY_LOGO_BUCKET)
    .getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
