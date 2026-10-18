import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-gray-100 px-4 py-8 sm:py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-600 transition-colors hover:text-black"
          aria-label="AvisTrack, accueil"
        >
          <Image
            src="/assets/logo.png"
            alt=""
            width={28}
            height={22}
            className="h-6 w-auto shrink-0 object-contain"
          />
          <span>AvisTrack</span>
        </Link>
      </div>
      <div className="w-full max-w-lg">{children}</div>
    </main>
  );
}
