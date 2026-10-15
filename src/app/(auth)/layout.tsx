import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-gray-100 px-4 py-12">
      <Link
        href="/"
        className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        aria-label="AvisTrack, accueil"
      >
        <span aria-hidden className="inline-block size-2.5 rounded-full bg-accent" />
        AvisTrack
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
