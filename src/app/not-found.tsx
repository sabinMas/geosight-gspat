import Link from "next/link";
import { MapPin } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16 text-[var(--foreground)]">
      <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--border-soft)] bg-[var(--surface-raised)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-soft)]">
          <MapPin className="h-5 w-5 text-[var(--muted-foreground)]" />
        </div>
        <div className="eyebrow mt-5">404 — Page not found</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          This place doesn&apos;t exist on the map.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)]">
          The URL you followed doesn&apos;t match any page in GeoSight. Head back to the home
          page to search a real place and start exploring.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90"
          >
            Back to GeoSight
          </Link>
        </div>
      </div>
    </main>
  );
}
