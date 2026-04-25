export function Footer() {
  return (
    <footer className="border-t border-[color:var(--border-soft)] bg-[var(--surface-panel)] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
              <span className="text-sm font-semibold text-[var(--foreground)]">GeoSight</span>
            </div>
            <p className="mt-2 max-w-xs text-xs leading-5 text-[var(--muted-foreground)]">
              Geospatial intelligence for first-pass location decisions. Search a place, understand what stands out.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer navigation">
            <a href="https://github.com/masonmorales/geosight-gspat" target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">GitHub</a>
            <a href="/explore" className="text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">Explore</a>
            <a href="/sources" className="text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">Data Sources</a>
            <a href="/privacy" className="text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">Privacy</a>
            <a href="/terms" className="text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">Terms</a>
          </nav>
        </div>
        <div className="mt-8 border-t border-[color:var(--border-soft)] pt-6 text-xs text-[var(--muted-foreground)]">
          © {new Date().getFullYear()} GeoSight. Built for first-pass location intelligence.
        </div>
      </div>
    </footer>
  );
}
