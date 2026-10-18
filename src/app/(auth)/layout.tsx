import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-gray-100 px-4 py-12">
      <Link
        href="/"
        className="flex items-center gap-2.5 text-xl font-bold tracking-tight"
        aria-label="AvisTrack, accueil"
      >
        <Image
          src="/assets/logo.png"
          alt=""
          width={36}
          height={28}
          className="h-8 w-auto shrink-0 object-contain"
          priority
        />
        <span>AvisTrack</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
