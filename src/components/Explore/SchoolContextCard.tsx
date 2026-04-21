import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { formatDistanceKm } from "@/lib/stream-gauges";
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
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--foreground)]">{school.name}</div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
            {[
              school.districtName,
              school.gradeSpan ? `Grades ${school.gradeSpan}` : null,
              school.distanceKm === null ? null : `${formatDistanceKm(school.distanceKm)} away`,
            ]
              .filter(Boolean)
              .join(" / ")}
          </div>
        </div>
        {school.officialMetrics ? (
          <div className="rounded-full border border-[color:var(--success-border)] bg-[var(--success-soft)] px-2 py-1 text-xs uppercase tracking-[0.18em] text-[var(--foreground)]">
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
  const sourceSummary = schoolContext
    ? summarizeSourceTrust(
        Object.values(schoolContext.sources),
        "School context",
      )
    : null;

  return (
    <WorkspaceCardShell eyebrow="Community context" title="School context">
        {loading ? (
          <StatePanel
            tone="loading"
            eyebrow="Education coverage"
            title="GeoSight is gathering school context"
            description="Nearby schools, district context, and accountability matches are still loading for this area."
            compact
          />
        ) : null}
        {error ? (
          <StatePanel
            tone="error"
            eyebrow="Education coverage"
            title="GeoSight hit a school-context issue"
            description={error}
            compact
          />
        ) : null}

        {schoolContext?.coverageStatus === "outside_us" ? (
          <StatePanel
            tone="partial"
            eyebrow="Education coverage"
            title="School-quality intelligence is still US-first"
            description="GeoSight can show mapped nearby schools outside the United States, but official quality and accountability coverage is not yet available for this country."
            compact
          />
        ) : null}

        {schoolContext?.coverageStatus === "osm_fallback" ? (
          <>
            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="eyebrow">OpenStreetMap school locations</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Schools within 16 km</div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                    {schoolContext.nearbySchoolCount}
                  </div>
                </div>
                {schoolContext.nearestSchoolDistanceKm !== null ? (
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Nearest school</div>
                    <div className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                      {formatDistanceKm(schoolContext.nearestSchoolDistanceKm)}
                    </div>
                  </div>
                ) : null}
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">
                {schoolContext.explanation}
              </p>
            </div>
            {sourceSummary ? (
              <TrustSummaryPanel
                summary={sourceSummary}
                sources={Object.values(schoolContext.sources)}
                note="School locations are sourced from OpenStreetMap for this region. Quality metrics and enrollment data are only available for US public schools."
              />
            ) : null}
          </>
        ) : null}

        {schoolContext && schoolContext.coverageStatus !== "osm_fallback" ? (
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
                        : formatDistanceKm(schoolContext.nearestSchoolDistanceKm)}
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

            {sourceSummary ? (
              <TrustSummaryPanel
                summary={sourceSummary}
                sources={Object.values(schoolContext.sources)}
                note="Washington accountability fields are official where matched. The overall GeoSight school-context score is a derived interpretation of proximity, school coverage, and any official metrics available."
              />
            ) : null}

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

            {schoolContext.notes.length ? (
              <div className="space-y-2 rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">Coverage notes</div>
                <div className="space-y-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {schoolContext.notes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          !loading &&
          !error && (
            <StatePanel
              tone="unavailable"
              eyebrow="Education coverage"
              title="School context has not loaded for this place yet"
              description="GeoSight needs a successful school-context lookup before it can score nearby schools or show accountability context here."
              compact
            />
          )
        )}
    </WorkspaceCardShell>
  );
}
