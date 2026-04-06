"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="space-y-2">
        <div className="eyebrow">Residential market</div>
        <CardTitle>Housing market</CardTitle>
      </CardHeader>
      <CardContent>
        <HousingMarketPulse
          locationName={locationName}
          housingMarket={housingMarket}
          loading={loading}
          error={error}
        />
      </CardContent>
    </Card>
  );
}
