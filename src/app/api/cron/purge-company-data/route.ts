import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { purgeCompanyData } from "@/server/repositories/company-retention-repository";

function isAuthorized(request: Request, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Purge job is not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await purgeCompanyData();
    if (result.failedAccounts > 0) {
      return NextResponse.json(
        { error: "Some account deletions failed and will be retried." },
        { status: 500 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[company-data-purge] Scheduled purge failed.", error);
    return NextResponse.json(
      { error: "Scheduled purge failed." },
      { status: 500 },
    );
  }
}
