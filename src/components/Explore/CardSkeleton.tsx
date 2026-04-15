"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CardSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardHeader>
        <div className="h-4 w-48 animate-pulse rounded-full bg-[var(--surface-soft)]" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-3 w-full animate-pulse rounded-full bg-[var(--surface-soft)]" />
        <div className="h-3 w-3/4 animate-pulse rounded-full bg-[var(--surface-soft)]" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-[var(--surface-soft)]" />
      </CardContent>
    </Card>
  );
}
