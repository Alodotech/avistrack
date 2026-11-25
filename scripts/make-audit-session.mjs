import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const envText = await readFile(resolve(process.cwd(), ".env.local"), "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [
        line.slice(0, index).trim(),
        line.slice(index + 1).trim().replace(/^["']|["']$/g, ""),
      ];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  throw new Error("Variables Supabase absentes de .env.local");
}

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anonClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const projectRef = new URL(url).hostname.split(".")[0];

async function makeState(email, output) {
  const link = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (link.error) throw link.error;
  const verified = await anonClient.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: "magiclink",
  });
  if (verified.error || !verified.data.session) throw verified.error;
  const session = verified.data.session;
  const state = {
    cookies: [
      {
        name: `sb-${projectRef}-auth-token`,
        value: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          expires_at: session.expires_at,
          token_type: session.token_type,
          user: session.user,
        }),
        domain: "localhost",
        path: "/",
        expires: session.expires_at,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ],
    origins: [],
  };
  await writeFile(output, JSON.stringify(state, null, 2));
  console.log(`session de test créée: ${email} → ${output}`);
}

if (process.env.AVIS_ADMIN_EMAIL) {
  await makeState(
    process.env.AVIS_ADMIN_EMAIL,
    process.env.AVIS_STORAGE_STATE ?? "/tmp/opencode/avis-storage.json",
  );
}
if (process.env.AVIS_COMPANY_EMAIL) {
  await makeState(
    process.env.AVIS_COMPANY_EMAIL,
    process.env.AVIS_COMPANY_STORAGE_STATE ?? "/tmp/opencode/avis-company-storage.json",
  );
}
