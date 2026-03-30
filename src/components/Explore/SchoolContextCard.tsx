import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSourceTimestamp } from "@/lib/source-metadata";
import { SchoolContextResult } from "@/types";

interface SchoolContextCardProps {
  schoolContext: SchoolContextResult | null;
  loading: boolean;
  error: string | null;
}

function SchoolRow({ school }: { school: SchoolContextResult["schools"][number] }) {
  return (
    <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--foreground)]">{school.name}</div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
            {[
              school.districtName,
              school.gradeSpan ? `Grades ${school.gradeSpan}` : null,
              school.distanceKm === null ? null : `${school.distanceKm.toFixed(1)} km away`,
            ]
              .filter(Boolean)
              .join(" / ")}
          </div>
        </div>
        {school.officialMetrics ? (
          <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--foreground)]">
            WA official
          </div>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 text-xs text-[var(--foreground-soft)] sm:grid-cols-2">
        <div>
          Enrollment:{" "}
          <span className="text-[var(--foreground)]">
            {school.enrollment === null ? "Unavailable" : school.enrollment.toLocaleString()}
          </span>
        </div>
        <div>
          Locale: <span className="text-[var(--foreground)]">{school.localeLabel ?? "Unavailable"}</span>
        </div>
        <div>
          Proficiency:{" "}
          <span className="text-[var(--foreground)]">
            {school.officialMetrics?.proficiencyPercent === null ||
            school.officialMetrics?.proficiencyPercent === undefined
              ? "Unavailable"
              : `${school.officialMetrics.proficiencyPercent}%`}
          </span>
        </div>
        <div>
          Participation:{" "}
          <span className="text-[var(--foreground)]">
            {school.officialMetrics?.participationPercent === null ||
            school.officialMetrics?.participationPercent === undefined
              ? "Unavailable"
              : `${school.officialMetrics.participationPercent}%`}
          </span>
        </div>
      </div>
      {school.officialMetrics?.subjectSummary ? (
        <div className="mt-2 text-xs text-[var(--muted-foreground)]">
          Official subjects: {school.officialMetrics.subjectSummary}
        </div>
      ) : null}
    </div>
  );
}

export function SchoolContextCard({
  schoolContext,
  loading,
  error,
}: SchoolContextCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Community context</div>
        <CardTitle>School context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Public K-12 school context for the active area. GeoSight shows a derived school-context
          score and surfaces Washington&apos;s official accountability metrics where available.
        </p>

        {loading ? <p className="text-sm text-[var(--muted-foreground)]">Loading school context...</p> : null}
        {error ? <p className="text-sm text-[var(--danger-foreground)]">{error}</p> : null}

        {schoolContext?.coverageStatus === "outside_us" ? (
          <div className="rounded-[1.5rem] border border-[color:var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-foreground)]">
            School-quality intelligence is US-first in v1 and is not yet available for this country.
          </div>
        ) : null}

        {schoolContext ? (
          <>
            <div className="grid gap-3 lg:grid-cols-[180px_1fr]">
              <div className="rounded-[1.75rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4 text-center">
                <div className="eyebrow">
                  GeoSight score
                </div>
                <div className="mt-4 text-5xl font-semibold text-[var(--foreground)]">
                  {schoolContext.score === null ? "--" : schoolContext.score}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  {schoolContext.band}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">{schoolContext.explanation}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
                    <div className="eyebrow">
                      Nearby schools
                    </div>
                    <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {schoolContext.nearbySchoolCount}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
                    <div className="eyebrow">
                      Nearest school
                    </div>
                    <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {schoolContext.nearestSchoolDistanceKm === null
                        ? "--"
                        : `${schoolContext.nearestSchoolDistanceKm.toFixed(1)} km`}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
                    <div className="eyebrow">
                      WA official matches
                    </div>
                    <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                      {schoolContext.matchedOfficialSchoolCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {Object.values(schoolContext.sources).map((source) => (
                <div key={source.id} className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">{source.label}</div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">{source.provider}</div>
                    </div>
                    <SourceStatusBadge source={source} />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-[var(--foreground-soft)]">{source.confidence}</div>
                  <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                    {formatSourceTimestamp(source.lastUpdated)}
                  </div>
                </div>
              ))}
            </div>

            {schoolContext.schools.length ? (
              <div className="space-y-3">
                <div className="eyebrow">
                  Nearby public schools
                </div>
                <div className="grid gap-3">
                  {schoolContext.schools.map((school) => (
                    <SchoolRow key={school.id} school={school} />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
