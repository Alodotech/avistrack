import type { ReactNode } from "react";

export default function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 justify-center bg-gray-100 px-4 py-10 sm:py-16">
      <div className="w-full max-w-lg">{children}</div>
    </main>
  );
}
