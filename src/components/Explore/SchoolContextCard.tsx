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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{school.name}</div>
          <div className="mt-1 text-xs text-slate-400">
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
          <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-50">
            WA official
          </div>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
        <div>
          Enrollment:{" "}
          <span className="text-white">
            {school.enrollment === null ? "Unavailable" : school.enrollment.toLocaleString()}
          </span>
        </div>
        <div>
          Locale: <span className="text-white">{school.localeLabel ?? "Unavailable"}</span>
        </div>
        <div>
          Proficiency:{" "}
          <span className="text-white">
            {school.officialMetrics?.proficiencyPercent === null ||
            school.officialMetrics?.proficiencyPercent === undefined
              ? "Unavailable"
              : `${school.officialMetrics.proficiencyPercent}%`}
          </span>
        </div>
        <div>
          Participation:{" "}
          <span className="text-white">
            {school.officialMetrics?.participationPercent === null ||
            school.officialMetrics?.participationPercent === undefined
              ? "Unavailable"
              : `${school.officialMetrics.participationPercent}%`}
          </span>
        </div>
      </div>
      {school.officialMetrics?.subjectSummary ? (
        <div className="mt-2 text-xs text-slate-400">
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
      <CardHeader>
        <CardTitle>School context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-300">
          Public K-12 school context for the active area. GeoSight shows a derived school-context
          score and surfaces Washington&apos;s official accountability metrics where available.
        </p>

        {loading ? <p className="text-sm text-slate-400">Loading school context...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {schoolContext?.coverageStatus === "outside_us" ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-50">
            School-quality intelligence is US-first in v1 and is not yet available for this country.
          </div>
        ) : null}

        {schoolContext ? (
          <>
            <div className="grid gap-3 lg:grid-cols-[180px_1fr]">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 text-center">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  GeoSight score
                </div>
                <div className="mt-4 text-5xl font-semibold text-white">
                  {schoolContext.score === null ? "--" : schoolContext.score}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {schoolContext.band}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm leading-6 text-slate-300">{schoolContext.explanation}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Nearby schools
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {schoolContext.nearbySchoolCount}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Nearest school
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {schoolContext.nearestSchoolDistanceKm === null
                        ? "--"
                        : `${schoolContext.nearestSchoolDistanceKm.toFixed(1)} km`}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      WA official matches
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {schoolContext.matchedOfficialSchoolCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {Object.values(schoolContext.sources).map((source) => (
                <div key={source.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{source.label}</div>
                      <div className="mt-1 text-xs text-slate-400">{source.provider}</div>
                    </div>
                    <SourceStatusBadge source={source} />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-300">{source.confidence}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    {formatSourceTimestamp(source.lastUpdated)}
                  </div>
                </div>
              ))}
            </div>

            {schoolContext.schools.length ? (
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
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
