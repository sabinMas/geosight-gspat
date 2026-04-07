"use client";

import { WorkspaceCardShell } from "@/components/Explore/WorkspaceCardShell";
import { HousingMarketPulse } from "@/components/Explore/HousingMarketPulse";
import type { HousingMarketResult } from "@/types";

interface HousingMarketCardProps {
  locationName: string;
  housingMarket: HousingMarketResult | null;
  loading: boolean;
  error: string | null;
}

export function HousingMarketCard({ locationName, housingMarket, loading, error }: HousingMarketCardProps) {
  return (
    <WorkspaceCardShell eyebrow="Residential market" title="Housing market">
      <HousingMarketPulse
        locationName={locationName}
        housingMarket={housingMarket}
        loading={loading}
        error={error}
      />
    </WorkspaceCardShell>
  );
}
