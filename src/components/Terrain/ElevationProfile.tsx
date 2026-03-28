"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { estimateRegionSpanKm } from "@/lib/geospatial";
import { Coordinates, ElevationProfilePoint, ElevationProfileSummary, RegionSelection } from "@/types";

interface ElevationProfileProps {
  center: Coordinates;
  region: RegionSelection;
  locationName: string;
}

export function ElevationProfile({
  center,
  region,
  locationName,
}: ElevationProfileProps) {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<ElevationProfilePoint[]>([]);
  const [summary, setSummary] = useState<ElevationProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const lengthKm = estimateRegionSpanKm(region.bbox);
        const params = new URLSearchParams({
          lat: String(center.lat),
          lng: String(center.lng),
          lengthKm: String(lengthKm),
          samples: "11",
        });
        const response = await fetch(`/api/elevation?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          profile?: ElevationProfilePoint[];
          summary?: ElevationProfileSummary;
          note?: string;
        };

        if (!response.ok) {
          throw new Error(payload.note ?? "Unable to load elevation profile.");
        }

        setProfile(payload.profile ?? []);
        setSummary(payload.summary ?? null);
        setError(payload.note ?? null);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setProfile([]);
        setSummary(null);
        setError(err instanceof Error ? err.message : "Unable to load elevation profile.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => controller.abort();
  }, [center.lat, center.lng, region.bbox]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Elevation cross-section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-300">
          Sampled transect across {locationName}. GeoSight uses USGS point elevations along the
          active analysis region to estimate terrain rise, drop, and relief.
        </p>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Length</div>
            <div className="mt-2 text-lg font-semibold text-white">
              {summary?.lengthKm?.toFixed(1) ?? "--"} km
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Min</div>
            <div className="mt-2 text-lg font-semibold text-white">
              {summary?.minElevation ?? "--"} m
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Max</div>
            <div className="mt-2 text-lg font-semibold text-white">
              {summary?.maxElevation ?? "--"} m
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Gain / Loss</div>
            <div className="mt-2 text-lg font-semibold text-white">
              {summary?.elevationGain ?? "--"} / {summary?.elevationLoss ?? "--"} m
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/8 p-4 text-sm text-cyan-50">
            Loading elevation samples...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-4 text-sm text-amber-50">
            {error}
          </div>
        ) : null}

        <div className="h-[260px]">
          {mounted && profile.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={profile}>
              <defs>
                <linearGradient id="elevationFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.75} />
                  <stop offset="100%" stopColor="#00e5ff" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="step" stroke="#6b7d93" />
              <YAxis stroke="#6b7d93" />
              <Tooltip
                contentStyle={{
                  background: "#081221",
                  border: "1px solid rgba(0,229,255,0.18)",
                  borderRadius: 16,
                }}
              />
              <Area type="monotone" dataKey="elevation" stroke="#00e5ff" fill="url(#elevationFill)" />
            </AreaChart>
          </ResponsiveContainer>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
