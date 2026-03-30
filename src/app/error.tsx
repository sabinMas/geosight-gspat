"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GeoSight][AppError]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16 text-[var(--foreground)]">
      <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="eyebrow">Application recovery</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          GeoSight hit an unexpected application error.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)]">
          The current page did not finish loading cleanly. You can retry this route or head back
          to the home page without refreshing the entire site manually.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90"
          >
            Retry page
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--border-soft)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
