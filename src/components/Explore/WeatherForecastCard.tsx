"use client";

import { useState } from "react";
import { TrustSummaryPanel } from "@/components/Source/TrustSummaryPanel";
import { StatePanel } from "@/components/Status/StatePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizeSourceTrust } from "@/lib/source-trust";
import { GeodataResult, WeatherForecastDay } from "@/types";

interface WeatherForecastCardProps {
  geodata: GeodataResult | null;
}

function formatTempC(value: number | null) {
  return value === null ? "--" : `${Math.round(value)}\u00b0`;
}

function formatTempF(value: number | null) {
  if (value === null) return "--";
  return `${Math.round((value * 9) / 5 + 32)}\u00b0`;
}

function formatPrecip(mm: number | null) {
  if (mm === null) return null;
  if (mm < 1) return "Trace";
  return `${mm.toFixed(1)} mm`;
}

function getPrecipProbabilityTone(prob: number | null) {
  if (prob === null) return "text-[var(--muted-foreground)]";
  if (prob >= 70) return "text-cyan-400";
  if (prob >= 40) return "text-sky-400";
  return "text-[var(--muted-foreground)]";
}

function getConditionTone(code: number | null) {
  if (code === null) return "text-[var(--muted-foreground)]";
  if (code === 0 || code <= 2) return "text-amber-400";
  if (code === 3) return "text-slate-400";
  if (code <= 48) return "text-slate-400";
  if (code <= 67 || (code >= 80 && code <= 82)) return "text-sky-400";
  if (code <= 77 || (code >= 85 && code <= 86)) return "text-cyan-300";
  if (code >= 95) return "text-orange-400";
  return "text-[var(--muted-foreground)]";
}

function ForecastRow({
  day,
  useFahrenheit,
  isToday,
}: {
  day: WeatherForecastDay;
  useFahrenheit: boolean;
  isToday: boolean;
}) {
  const formatTemp = useFahrenheit ? formatTempF : formatTempC;

  return (
    <div
      className={`grid grid-cols-[3.5rem_1fr_auto_auto_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
        isToday ? "bg-[var(--surface-raised)]" : ""
      }`}
    >
      <div className="font-medium text-[var(--foreground)]">
        {isToday ? "Today" : day.dayLabel}
      </div>
      <div className={`truncate text-xs ${getConditionTone(day.weatherCode)}`}>
        {day.conditionLabel ?? "—"}
      </div>
      <div className={`text-xs ${getPrecipProbabilityTone(day.precipitationProbability)}`}>
        {day.precipitationProbability !== null ? `${day.precipitationProbability}%` : "—"}
      </div>
      <div className="text-right text-[var(--muted-foreground)]">
        {formatTemp(day.lowTempC)}
      </div>
      <div className="text-right font-medium text-[var(--foreground)]">
        {formatTemp(day.highTempC)}
      </div>
    </div>
  );
}

export function WeatherForecastCard({ geodata }: WeatherForecastCardProps) {
  const [useFahrenheit, setUseFahrenheit] = useState(false);

  if (!geodata) {
    return null;
  }

  const trustSummary = summarizeSourceTrust([geodata.sources.climate], "7-day weather forecast");
  const { weatherForecast } = geodata;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Weather outlook</div>
        <div className="flex items-start justify-between gap-4">
          <CardTitle>7-day forecast</CardTitle>
          <button
            onClick={() => setUseFahrenheit((prev) => !prev)}
            className="shrink-0 rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
          >
            {useFahrenheit ? "°C" : "°F"}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {weatherForecast.length > 0 ? (
          <>
            <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-1">
              <div className="grid grid-cols-[3.5rem_1fr_auto_auto_auto] gap-3 px-3 pb-1 pt-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Day</div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Condition</div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Rain</div>
                <div className="text-right text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Low</div>
                <div className="text-right text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">High</div>
              </div>
              {weatherForecast.map((day, index) => (
                <ForecastRow
                  key={day.date}
                  day={day}
                  useFahrenheit={useFahrenheit}
                  isToday={index === 0}
                />
              ))}
            </div>

            {geodata.climate.weatherRiskSummary && (
              <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="eyebrow">Current conditions</div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {geodata.climate.weatherRiskSummary}
                </p>
              </div>
            )}

            <details className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
                Wind and UV detail
              </summary>
              <div className="mt-3 space-y-1">
                {weatherForecast.map((day, index) => (
                  <div
                    key={day.date}
                    className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-xs"
                  >
                    <div className="text-[var(--muted-foreground)]">
                      {index === 0 ? "Today" : day.dayLabel}
                    </div>
                    <div className="text-[var(--muted-foreground)]">
                      {day.windSpeedKph !== null ? `Wind ${Math.round(day.windSpeedKph)} km/h` : "—"}
                    </div>
                    <div className="text-right text-[var(--muted-foreground)]">
                      {day.uvIndex !== null ? `UV ${day.uvIndex.toFixed(0)}` : "—"}
                    </div>
                  </div>
                ))}
              </div>
              {weatherForecast[0]?.precipitationMm !== null && (
                <div className="mt-3 space-y-1 border-t border-[color:var(--border-soft)] pt-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Precipitation totals</div>
                  {weatherForecast.map((day, index) => (
                    <div
                      key={day.date}
                      className="grid grid-cols-[3.5rem_auto] gap-3 text-xs"
                    >
                      <div className="text-[var(--muted-foreground)]">
                        {index === 0 ? "Today" : day.dayLabel}
                      </div>
                      <div className="text-[var(--muted-foreground)]">
                        {formatPrecip(day.precipitationMm) ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </details>
          </>
        ) : (
          <StatePanel
            tone="unavailable"
            eyebrow="Forecast coverage"
            title="Weather forecast is not available for this location"
            description={
              geodata.sources.climate.note ??
              "Open-Meteo could not return a forecast for this point. This is unusual given their global coverage — try refreshing or selecting a slightly different location."
            }
            compact
          />
        )}

        <TrustSummaryPanel
          summary={trustSummary}
          sources={[geodata.sources.climate]}
          note="GeoSight uses Open-Meteo free forecast API, which provides global 7-day daily forecasts with no key required. The forecast is cached for up to 6 hours."
        />
      </CardContent>
    </Card>
  );
}
