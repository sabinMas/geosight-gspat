import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — GeoSight",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8">
        <Link href="/" className="text-sm text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">
          ← GeoSight
        </Link>
      </div>
      <div className="eyebrow mb-3">Legal</div>
      <h1 className="text-3xl font-semibold text-[var(--foreground)]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">Last updated: April 2026</p>
      <div className="mt-8 space-y-6 text-sm leading-7 text-[var(--foreground-soft)]">
        <p>
          This privacy policy is currently being finalized. GeoSight does not sell or share personal data with third parties.
        </p>
        <p>
          GeoSight uses location queries you enter to fetch geospatial data from public sources (USGS, NOAA, OpenStreetMap, and others). These queries are not linked to your identity and are not stored beyond the active session.
        </p>
        <p>
          For questions about data handling, contact the project maintainer via{" "}
          <a
            href="https://github.com/sabinMas/geosight-gspat"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline underline-offset-2"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </main>
  );
}
