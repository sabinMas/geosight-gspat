"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const profile = [
  { step: "0 km", elevation: 76 },
  { step: "2 km", elevation: 81 },
  { step: "4 km", elevation: 86 },
  { step: "6 km", elevation: 99 },
  { step: "8 km", elevation: 108 },
  { step: "10 km", elevation: 124 },
];

export function ElevationProfile() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Elevation cross-section</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        {mounted ? (
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
      </CardContent>
    </Card>
  );
}
