"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ChatPanel } from "@/components/Analysis/ChatPanel";
import { ImageUpload } from "@/components/Analysis/ImageUpload";
import { LandClassifier } from "@/components/Analysis/LandClassifier";
import { CoolingDemoOverlay } from "@/components/Demo/CoolingDemoOverlay";
import { DataLayers, LayerState } from "@/components/Globe/DataLayers";
import { RegionSelector } from "@/components/Globe/RegionSelector";
import { AnalysisTrendsPanel } from "@/components/Results/AnalysisTrendsPanel";
import { NearbyPlacesList } from "@/components/Results/NearbyPlacesList";
import { ResultsModeToggle } from "@/components/Results/ResultsModeToggle";
import { CompareTable } from "@/components/Scoring/CompareTable";
import { FactorBreakdown } from "@/components/Scoring/FactorBreakdown";
import { ScoreCard } from "@/components/Scoring/ScoreCard";
import { SearchBar } from "@/components/Shell/SearchBar";
import { Sidebar } from "@/components/Shell/Sidebar";
import { ElevationProfile } from "@/components/Terrain/ElevationProfile";
import { TerrainViewer } from "@/components/Terrain/TerrainViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobeInteraction } from "@/hooks/useGlobeInteraction";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useSavedSites } from "@/hooks/useSavedSites";
import { useSiteAnalysis } from "@/hooks/useSiteAnalysis";
import { DEFAULT_VIEW, PRELOADED_SITES } from "@/lib/demo-data";
import { buildLocationTrends } from "@/lib/data-trends";
import { DEFAULT_PROFILE, PROFILES } from "@/lib/profiles";
import { calculateProfileScore } from "@/lib/scoring";
import { MissionProfile, ResultsMode } from "@/types";

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
  const [activeProfile, setActiveProfile] = useState<MissionProfile>(DEFAULT_PROFILE);
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
    activeProfile.demoSites ?? [],
  );
  const { geodata, score, loading, error } = useSiteAnalysis(selectedPoint, activeProfile);
  const { sites, addSite, loadDemoSites } = useSavedSites(activeProfile.id);
  const { category, setCategory, categories, places } = useNearbyPlaces(
    selectedPoint,
    selectedLocationName,
  );

  const [layers, setLayers] = useState<LayerState>(activeProfile.defaultLayers);
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.8);
  const [imageSummary, setImageSummary] = useState(
    "No image uploaded yet. Use the upload panel to run client-side land cover estimation.",
  );
  const [uploadedClassification, setUploadedClassification] = useState(
    geodata?.landClassification ?? [],
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultsMode, setResultsMode] = useState<ResultsMode>("analysis");
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    setLayers(activeProfile.defaultLayers);
  }, [activeProfile]);

  const effectiveClassification = useMemo(
    () =>
      uploadedClassification.length
        ? uploadedClassification
        : geodata?.landClassification ?? [],
    [geodata?.landClassification, uploadedClassification],
  );

  const dataTrends = useMemo(() => buildLocationTrends(geodata), [geodata]);

  const handleSaveCurrentSite = () => {
    if (!geodata) {
      return;
    }

    addSite({
      id: crypto.randomUUID(),
      name: `${activeProfile.name} Site ${sites.length + 1}`,
      regionName: selectedLocationName,
      profileId: activeProfile.id,
      coordinates: selectedPoint,
      geodata,
      score: score ?? calculateProfileScore(geodata, activeProfile),
    });
  };

  const handleLoadShowcase = () => {
    loadDemoSites(PRELOADED_SITES);
    setActiveProfile(DEFAULT_PROFILE);
    const firstSite = PRELOADED_SITES[0];
    if (firstSite) {
      selectPoint(firstSite.coordinates, `${firstSite.name} cooling demo`);
    }
  };

  const handleFocusDemoSite = (siteId: string) => {
    loadDemoSites(PRELOADED_SITES);
    setActiveProfile(DEFAULT_PROFILE);
    const site = PRELOADED_SITES.find((candidate) => candidate.id === siteId);
    if (!site) {
      return;
    }

    selectPoint(site.coordinates, `${site.name} cooling demo`);
  };

  return (
    <main className="min-h-screen overflow-hidden p-4">
      <div className="grid gap-4 xl:grid-cols-[360px_1.1fr_420px]">
        <Sidebar
          activeProfile={activeProfile}
          profiles={PROFILES}
          selectedLocationName={selectedLocationName}
          selectedRegion={selectedRegion}
          onOpenDemo={() => setDemoOpen(true)}
          onSelectProfile={setActiveProfile}
          onSelectRegion={(region) => {
            setSelectedRegion(region);
            selectPoint(region.center, region.name);
          }}
          quickRegions={quickRegions}
        />

        <div className="space-y-4">
          <SearchBar
            activeLocationName={selectedLocationName}
            onLocate={(result) => selectPoint(result.coordinates, result.name)}
          />

          <section className="relative min-h-[560px] overflow-hidden rounded-[2rem] border border-cyan-400/15 bg-slate-950/60">
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
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Active location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-lg font-semibold text-white">{selectedLocationName}</div>
                <div className="mt-1 font-mono text-xs text-slate-400">
                  {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Elevation</div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {geodata?.elevationMeters ?? "--"} m
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Nearest water</div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {geodata?.nearestWaterBody.name ?? "Loading..."}
                  </div>
                  <div className="text-xs text-slate-400">
                    {geodata?.nearestWaterBody.distanceKm?.toFixed(1) ?? "--"} km
                  </div>
                </div>
              </div>

              <p className="text-sm leading-6 text-slate-300">
                Active mission profile:{" "}
                <span style={{ color: activeProfile.accentColor }}>{activeProfile.name}</span>
              </p>
              {loading ? <p className="text-sm text-slate-400">Fetching geospatial context...</p> : null}
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </CardContent>
          </Card>

          <ScoreCard score={score} title={`${activeProfile.name} score`} profile={activeProfile} />

          <ChatPanel
            profile={activeProfile}
            location={selectedPoint}
            locationName={selectedLocationName}
            resultsMode={resultsMode}
            geodata={geodata}
            nearbyPlaces={places}
            dataTrends={dataTrends}
            imageSummary={imageSummary}
            classification={effectiveClassification}
          />
        </aside>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Results mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-slate-300">
                Switch between area-level analysis and list-style nearby results without changing
                the active location.
              </p>
              <ResultsModeToggle mode={resultsMode} onChange={setResultsMode} />
            </CardContent>
          </Card>

          {resultsMode === "analysis" ? (
            <AnalysisTrendsPanel trends={dataTrends} />
          ) : (
            <NearbyPlacesList
              category={category}
              categories={categories}
              places={places}
              onCategoryChange={setCategory}
            />
          )}
        </div>

        <div className="space-y-4">
          <FactorBreakdown
            score={score}
            title={`${activeProfile.name} factor breakdown`}
          />
          <CompareTable
            sites={sites}
            title={`${activeProfile.name} comparison`}
            emptyMessage={`Save ${activeProfile.name.toLowerCase()} candidates to compare them here.`}
          />
        </div>

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
          <TerrainViewer
            exaggeration={terrainExaggeration}
            onExaggerationChange={setTerrainExaggeration}
          />
          <ElevationProfile />
        </div>
      </div>

      <CoolingDemoOverlay
        open={demoOpen}
        score={score}
        sites={sites}
        onClose={() => setDemoOpen(false)}
        onLoadShowcase={handleLoadShowcase}
        onSaveCurrentSite={handleSaveCurrentSite}
        onFocusSite={handleFocusDemoSite}
      />
    </main>
  );
}
