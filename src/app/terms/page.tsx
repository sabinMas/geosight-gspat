import Link from "next/link";

export const metadata = {
  title: "Terms of Use — GeoSight",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8">
        <Link href="/" className="text-sm text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">
          ← GeoSight
        </Link>
      </div>
      <div className="eyebrow mb-3">Legal</div>
      <h1 className="text-3xl font-semibold text-[var(--foreground)]">Terms of Use</h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">Last updated: April 2026</p>
      <div className="mt-8 space-y-6 text-sm leading-7 text-[var(--foreground-soft)]">
        <p>
          These terms of use are currently being finalized. By using GeoSight you agree to use the platform for lawful purposes only.
        </p>
        <p>
          GeoSight is a decision-support tool. All scores, signals, and AI-assisted analysis are provided for informational purposes and should not be the sole basis for investment, construction, regulatory, or safety decisions. Always consult qualified professionals before acting on location intelligence.
        </p>
        <p>
          Data presented by GeoSight is sourced from public databases (USGS, NOAA, OpenStreetMap, and others). GeoSight does not guarantee the accuracy, completeness, or timeliness of this data.
        </p>
        <p>
          For questions, contact the project maintainer via{" "}
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
