"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Sidebar } from "@/components/Shell/Sidebar";
import { SearchBar } from "@/components/Shell/SearchBar";
import { DataLayers, LayerState } from "@/components/Globe/DataLayers";
import { RegionSelector } from "@/components/Globe/RegionSelector";
import { ImageUpload } from "@/components/Analysis/ImageUpload";
import { LandClassifier } from "@/components/Analysis/LandClassifier";
import { ChatPanel } from "@/components/Analysis/ChatPanel";
import { ScoreCard } from "@/components/Scoring/ScoreCard";
import { FactorBreakdown } from "@/components/Scoring/FactorBreakdown";
import { CompareTable } from "@/components/Scoring/CompareTable";
import { TerrainViewer } from "@/components/Terrain/TerrainViewer";
import { ElevationProfile } from "@/components/Terrain/ElevationProfile";
import { useGlobeInteraction } from "@/hooks/useGlobeInteraction";
import { useSavedSites } from "@/hooks/useSavedSites";
import { useSiteAnalysis } from "@/hooks/useSiteAnalysis";
import { DEFAULT_VIEW } from "@/lib/demo-data";
import { calculateSiteScore } from "@/lib/scoring";
import { Button } from "@/components/ui/button";

const CesiumGlobe = dynamic(
  () => import("@/components/Globe/CesiumGlobe").then((mod) => mod.CesiumGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-cyan-400/20 bg-slate-950/60 text-slate-300">
        Loading 3D globe...
      </div>
    ),
  },
);

export default function HomePage() {
  const {
    selectedPoint,
    selectedLocationName,
    selectedRegion,
    selectPoint,
    setSelectedRegion,
    quickRegions,
  } = useGlobeInteraction(
    { lat: DEFAULT_VIEW.lat, lng: DEFAULT_VIEW.lng },
    "Columbia River Gorge",
  );
  const { geodata, score, loading, error } = useSiteAnalysis(selectedPoint);
  const { sites, addSite } = useSavedSites();

  const [layers, setLayers] = useState<LayerState>({
    water: true,
    power: true,
    roads: true,
    heatmap: false,
  });
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.8);
  const [imageSummary, setImageSummary] = useState(
    "No image uploaded yet. Use the upload panel to run client-side land cover estimation.",
  );
  const [uploadedClassification, setUploadedClassification] = useState(geodata?.landClassification ?? []);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const effectiveClassification = useMemo(
    () => uploadedClassification.length ? uploadedClassification : geodata?.landClassification ?? [],
    [geodata?.landClassification, uploadedClassification],
  );

  const handleSaveCurrentSite = () => {
    if (!geodata) {
      return;
    }

    addSite({
      id: crypto.randomUUID(),
      name: `Custom Site ${sites.length + 1}`,
      regionName: selectedRegion.name,
      coordinates: selectedPoint,
      geodata,
      score: score ?? calculateSiteScore(geodata),
    });
  };

  return (
    <main className="min-h-screen overflow-hidden p-4">
      <div className="relative flex min-h-[calc(100vh-2rem)] flex-col gap-4 lg:flex-row">
        <Sidebar
          selectedLocationName={selectedLocationName}
          selectedRegion={selectedRegion}
          onSelectRegion={(region) => {
            setSelectedRegion(region);
            selectPoint(region.center, region.name);
          }}
          quickRegions={quickRegions}
        />

        <section className="relative min-h-[420px] flex-1 overflow-hidden rounded-[2rem] border border-cyan-400/15 bg-slate-950/60">
          <SearchBar
            onLocate={(result) => selectPoint(result.coordinates, result.name)}
          />
          <CesiumGlobe
            selectedPoint={selectedPoint}
            selectedRegion={selectedRegion}
            onPointSelect={selectPoint}
            savedSites={sites}
            layers={layers}
            terrainExaggeration={terrainExaggeration}
          />
          <DataLayers layers={layers} onChange={setLayers} />
          <RegionSelector
            region={selectedRegion}
            onReset={() =>
              selectPoint(
                { lat: DEFAULT_VIEW.lat, lng: DEFAULT_VIEW.lng },
                "Columbia River Gorge",
              )
            }
          />
        </section>

        <aside className="flex w-full max-w-[420px] flex-col gap-4">
          <div className="glass-panel rounded-[2rem] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-200">Live analysis</div>
                <div className="mt-1 text-sm font-medium text-white">{selectedLocationName}</div>
                <div className="mt-1 font-mono text-sm text-white">
                  {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                </div>
              </div>
              <Button onClick={handleSaveCurrentSite} disabled={!geodata}>
                Save site
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Elevation</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {geodata?.elevationMeters ?? "--"} m
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Nearest water</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {geodata?.nearestWaterBody.name ?? "Loading..."}
                </div>
                <div className="text-xs text-slate-400">
                  {geodata?.nearestWaterBody.distanceKm?.toFixed(1) ?? "--"} km
                </div>
              </div>
            </div>

            {loading ? <p className="mt-3 text-sm text-slate-400">Fetching geospatial context...</p> : null}
            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
          </div>

          <ScoreCard score={score} />
          <FactorBreakdown score={score} />
        </aside>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <div className="space-y-4">
          <ImageUpload
            previewUrl={previewUrl}
            onClassify={(summary, buckets, nextPreviewUrl) => {
              setImageSummary(summary);
              setUploadedClassification(buckets);
              setPreviewUrl(nextPreviewUrl);
            }}
          />
          <LandClassifier results={effectiveClassification} />
        </div>
        <div className="space-y-4">
          <ChatPanel
            location={selectedPoint}
            locationName={selectedLocationName}
            geodata={geodata}
            imageSummary={imageSummary}
            classification={effectiveClassification}
          />
          <TerrainViewer
            exaggeration={terrainExaggeration}
            onExaggerationChange={setTerrainExaggeration}
          />
        </div>
        <div className="space-y-4">
          <CompareTable sites={sites} />
          <ElevationProfile />
        </div>
      </div>
    </main>
  );
}
