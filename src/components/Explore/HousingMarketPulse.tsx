"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, Home, Loader2 } from "lucide-react";
import { Line, LineChart, Tooltip, YAxis } from "recharts";
import { SourceInfoButton } from "@/components/Source/SourceInfoButton";
import { SourceStatusBadge } from "@/components/Source/SourceStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { SafeResponsiveContainer } from "@/components/ui/safe-responsive-container";
import { cn } from "@/lib/utils";
import type { HousingMarketResult } from "@/types";

interface HousingMarketPulseProps {
  locationName: string;
  housingMarket: HousingMarketResult | null;
  loading: boolean;
  error: string | null;
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCount(value: number | null) {
  if (value === null) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function MarketStat({
  label,
  value,
  series,
  color,
}: {
  label: string;
  value: string;
  series: Array<{ label: string; value: number | null }>;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-[var(--surface-soft)] p-4 dark:border-neutral-700">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
        {value}
      </div>
      <div className="mt-3 h-14">
        <SafeResponsiveContainer className="h-full">
          <LineChart data={series}>
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{
                background: "rgba(8, 18, 31, 0.96)",
                border: "1px solid rgba(83, 221, 255, 0.18)",
                borderRadius: 14,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </SafeResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-[var(--muted-foreground)]">Trailing 12 months</div>
    </div>
  );
}

export function HousingMarketPulse({
  locationName,
  housingMarket,
  loading,
  error: _error,
}: HousingMarketPulseProps) {
  void _error;
  const [open, setOpen] = useState(true);

  const salePriceSeries = useMemo(
    () =>
      housingMarket?.series.map((point) => ({
        label: point.label,
        value: point.medianSalePrice,
      })) ?? [],
    [housingMarket?.series],
  );
  const domSeries = useMemo(
    () =>
      housingMarket?.series.map((point) => ({
        label: point.label,
        value: point.medianDom,
      })) ?? [],
    [housingMarket?.series],
  );
  const inventorySeries = useMemo(
    () =>
      housingMarket?.series.map((point) => ({
        label: point.label,
        value: point.activeListings,
      })) ?? [],
    [housingMarket?.series],
  );

  return (
    <section className="rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-soft)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-[var(--accent)]" />
            <div className="text-sm font-semibold text-[var(--foreground)]">Housing Market Pulse</div>
            {housingMarket ? <SourceStatusBadge source={housingMarket.source} /> : null}
          </div>
          <div className="mt-1 text-sm text-[var(--muted-foreground)]">
            Metro-level residential market context for {locationName}
            {housingMarket?.monthLabel ? ` · ${housingMarket.monthLabel}` : ""}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open ? (
        <div className="space-y-4 border-t border-[color:var(--border-soft)] px-4 pb-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {housingMarket ? (
                <SourceInfoButton source={housingMarket.source} title="Housing market source" />
              ) : null}
              {housingMarket?.regionLabel ? (
                <span className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--foreground-soft)]">
                  {housingMarket.regionLabel}
                </span>
              ) : null}
            </div>
            {housingMarket?.marketUrl ? (
              <Link
                href={housingMarket.marketUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({
                  variant: "secondary",
                  size: "sm",
                  className: "rounded-full",
                })}
              >
                View listings near this point
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            ) : null}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading live housing market context...
            </div>
          ) : housingMarket?.status === "live" ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <MarketStat
                  label="Median sale price"
                  value={formatCurrency(housingMarket.medianSalePrice)}
                  series={salePriceSeries}
                  color="#53ddff"
                />
                <MarketStat
                  label="Median DOM"
                  value={housingMarket.medianDom === null ? "--" : `${formatCount(housingMarket.medianDom)} d`}
                  series={domSeries}
                  color="#ffab00"
                />
                <MarketStat
                  label="Active listings"
                  value={formatCount(housingMarket.activeListings)}
                  series={inventorySeries}
                  color="#5be49b"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {housingMarket.notes.map((note) => (
                  <div
                    key={note}
                    className={cn(
                      "rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--muted-foreground)]",
                    )}
                  >
                    {note}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {housingMarket?.notes[0] ??
                "Housing market data is available for US metro areas. This location falls outside coverage."}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
