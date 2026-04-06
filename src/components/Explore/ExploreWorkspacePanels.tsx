"use client";

import { ReactNode } from "react";
import { ChatPanel } from "@/components/Analysis/ChatPanel";
import { ImageUpload } from "@/components/Analysis/ImageUpload";
import { LandClassifier } from "@/components/Analysis/LandClassifier";
import { ActiveLocationCard } from "@/components/Explore/ActiveLocationCard";
import { AirQualityCard } from "@/components/Explore/AirQualityCard";
import { BroadbandCard } from "@/components/Explore/BroadbandCard";
import { ClimateHistoryCard } from "@/components/Explore/ClimateHistoryCard";
import { ContaminationRiskCard } from "@/components/Explore/ContaminationRiskCard";
import { DemographicsCard } from "@/components/Explore/DemographicsCard";
import { EarthquakeHistoryCard } from "@/components/Explore/EarthquakeHistoryCard";
import { FireHistoryCard } from "@/components/Explore/FireHistoryCard";
import { CoolingWaterCard } from "@/components/Explore/CoolingWaterCard";
import { FloodRiskCard } from "@/components/Explore/FloodRiskCard";
import { GroundwaterCard } from "@/components/Explore/GroundwaterCard";
import { HazardCard } from "@/components/Explore/HazardCard";
import { HousingMarketCard } from "@/components/Explore/HousingMarketCard";
import { InfrastructureAccessCard } from "@/components/Explore/InfrastructureAccessCard";
import { LocalAccessCard } from "@/components/Explore/LocalAccessCard";
import { SiteReadinessCard } from "@/components/Explore/SiteReadinessCard";
import { MultiHazardResilienceCard } from "@/components/Explore/MultiHazardResilienceCard";
import { HazardDetailsCard } from "@/components/Explore/HazardDetailsCard";
import { OutdoorFitCard } from "@/components/Explore/OutdoorFitCard";
import { SchoolContextCard } from "@/components/Explore/SchoolContextCard";
import { SeismicDesignCard } from "@/components/Explore/SeismicDesignCard";
import { SoilProfileCard } from "@/components/Explore/SoilProfileCard";
import { SourceAwarenessCard } from "@/components/Explore/SourceAwarenessCard";
import { TripSummaryCard } from "@/components/Explore/TripSummaryCard";
import { WeatherForecastCard } from "@/components/Explore/WeatherForecastCard";
import { AnalysisTrendsPanel } from "@/components/Results/AnalysisTrendsPanel";
import { NearbyPlacesList } from "@/components/Results/NearbyPlacesList";
import { CompareTable } from "@/components/Scoring/CompareTable";
import { FactorBreakdown } from "@/components/Scoring/FactorBreakdown";
import { ScoreCard } from "@/components/Scoring/ScoreCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatePanel } from "@/components/Status/StatePanel";
import { useExploreData } from "@/hooks/useExploreData";
import { useExploreState } from "@/hooks/useExploreState";
import { WORKSPACE_CARD_MAP } from "@/lib/workspace-cards";
import { WorkspaceCardId } from "@/types";
import { ElevationProfile } from "../Terrain/ElevationProfile";
import { TerrainViewer } from "../Terrain/TerrainViewer";

type ExploreStateValue = ReturnType<typeof useExploreState>;
type ExploreDataValue = ReturnType<typeof useExploreData>;

interface SharedPanelProps {
  cardId: WorkspaceCardId;
  state: ExploreStateValue;
  data: ExploreDataValue;
  onOpenCard: (cardId: WorkspaceCardId) => void;
}

interface PrimaryPanelProps extends SharedPanelProps {
  headerContent: ReactNode;
  onSaveCurrentSite: () => void;
}

function WorkspaceCardPlaceholder({
  cardId,
  detail,
}: {
  cardId: WorkspaceCardId;
  detail: string;
}) {
  const card = WORKSPACE_CARD_MAP[cardId];

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="eyebrow">Supporting view</div>
        <CardTitle>{card.title}</CardTitle>
        <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{card.summary}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatePanel
          tone="partial"
          eyebrow="Card status"
          title={`${card.title} is waiting on supporting inputs`}
          description={detail}
          compact
        />
        <div className="rounded-[1.5rem] border border-[color:var(--border-soft)] bg-[var(--surface-soft)] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            What this view answers
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{card.questionAnswered}</p>
          <div className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Next best moves
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {card.compactActions.map((action) => (
              <span
                key={action}
                className="rounded-full border border-[color:var(--border-soft)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--muted-foreground)]"
              >
                {action}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDataDependencyPlaceholder(
  cardId: WorkspaceCardId,
  state: ExploreStateValue,
  data: ExploreDataValue,
) {
  const locationLabel =
    state.selectedLocationName && state.selectedLocationName !== "New focus"
      ? state.selectedLocationName
      : "this place";

  const scoreCards = new Set<WorkspaceCardId>(["score", "factor-breakdown"]);
  const geodataCards = new Set<WorkspaceCardId>([
    "source-awareness",
    "hazard-context",
    "climate-history",
    "broadband-context",
    "flood-risk",
    "cooling-water",
    "groundwater",
    "soil-profile",
    "seismic-design",
    "air-quality",
    "contamination-risk",
    "weather-forecast",
    "demographics-context",
    "outdoor-fit",
    "trip-summary",
    "local-access",
    "earthquake-history",
    "fire-history",
    "multi-hazard-resilience",
    "site-readiness",
    "infrastructure-access",
    "hazard-details",
  ]);

  if (scoreCards.has(cardId) && !data.siteScore) {
    return (
      <WorkspaceCardPlaceholder
        cardId={cardId}
        detail={
          data.loading
            ? `GeoSight is still preparing the live score inputs for ${locationLabel}. This view will populate as soon as the current location analysis completes.`
            : `GeoSight does not have enough live scoring inputs for ${locationLabel} yet. Try re-running the location analysis or opening source awareness to inspect the coverage gap.`
        }
      />
    );
  }

  if (geodataCards.has(cardId) && !data.geodata) {
    return (
      <WorkspaceCardPlaceholder
        cardId={cardId}
        detail={
          data.loading
            ? `GeoSight is still gathering live geodata for ${locationLabel}. This supporting view will fill in once the location load finishes.`
            : `Live geodata is unavailable for ${locationLabel} right now, so GeoSight cannot populate this view yet. Try another region, rerun the search, or inspect the trust panel for provider status.`
        }
      />
    );
  }

  return null;
}

export function ExplorePrimaryPanel({
  cardId,
  state,
  data,
  headerContent,
  onSaveCurrentSite,
  onOpenCard,
}: PrimaryPanelProps) {
  if (cardId === "active-location") {
    return (
      <ActiveLocationCard
        geodata={data.geodata}
        loading={data.loading}
        error={data.error}
        locationName={state.selectedLocationName}
        lat={state.selectedPoint.lat}
        lng={state.selectedPoint.lng}
        profile={state.activeProfile}
        siteScore={data.siteScore}
        onSaveSite={onSaveCurrentSite}
        onOpenSources={() => onOpenCard("source-awareness")}
        showSourceDetailsCta={data.showSourcePrompt}
        showCompareCta={data.showComparePrompt}
        onOpenCompare={() => onOpenCard("compare")}
        analysisCapabilities={data.analysisCapabilities}
        capabilityAnalysisLoading={data.capabilityAnalysisLoading}
        capabilityAnalysisError={data.capabilityAnalysisError}
        capabilityAnalysisResult={data.capabilityAnalysisResult}
        onRunCapabilityAnalysis={data.runCapabilityAnalysis}
        onClearCapabilityAnalysis={data.clearCapabilityAnalysis}
      />
    );
  }

  if (cardId === "chat") {
    return (
      <ChatPanel
        profile={state.activeProfile}
        location={state.selectedPoint}
        locationName={state.selectedLocationName}
        resultsMode={state.resultsMode}
        geodata={data.geodata}
        geodataLoading={data.loading}
        groundingFallbackSources={data.groundingFallbackSources}
        nearbyPlaces={data.places}
        nearbySource={data.nearbySource}
        dataTrends={data.locationTrends}
        imageSummary={state.imageSummary}
        classification={data.effectiveClassification}
        onQuestionAsked={data.handleQuestionIntent}
      />
    );
  }

  if (cardId === "results") {
    return state.resultsMode === "analysis" ? (
      <AnalysisTrendsPanel trends={data.locationTrends} headerContent={headerContent} />
    ) : (
      <NearbyPlacesList
        category={data.category}
        categories={data.categories}
        places={data.places}
        loading={data.nearbyLoading}
        error={data.nearbyError}
        source={data.nearbySource}
        onCategoryChange={data.setCategory}
        headerContent={headerContent}
      />
    );
  }

  return null;
}

export function ExploreWorkspacePanel({
  cardId,
  state,
  data,
  onOpenCard,
}: SharedPanelProps) {
  const housingMarketCards = new Set<WorkspaceCardId>(["housing-market"]);

  if (housingMarketCards.has(cardId) && !data.housingMarket && !data.housingMarketLoading) {
    return (
      <WorkspaceCardPlaceholder
        cardId={cardId}
        detail="Housing market data is available for US metro areas. Select a US location to see residential market context."
      />
    );
  }

  const dataDependencyPlaceholder = getDataDependencyPlaceholder(cardId, state, data);
  if (dataDependencyPlaceholder) {
    return dataDependencyPlaceholder;
  }

  switch (cardId) {
    case "score":
      return (
        <ScoreCard
          score={data.siteScore}
          title={`${state.activeProfile.name} score`}
          profile={state.activeProfile}
          onOpenDetails={() => onOpenCard("factor-breakdown")}
        />
      );
    case "factor-breakdown":
      return (
        <FactorBreakdown
          score={data.siteScore}
          title={`${state.activeProfile.name} factor breakdown`}
        />
      );
    case "compare":
      return data.sites.length >= 2 ? (
        <CompareTable
          sites={data.sites}
          title={`${state.activeProfile.name} comparison`}
          emptyMessage={`Save ${state.activeProfile.name.toLowerCase()} candidates to compare them here.`}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Comparison</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-[var(--muted-foreground)]">
            Save at least two sites to unlock side-by-side comparison.
          </CardContent>
        </Card>
      );
    case "terrain-viewer":
      return (
        <TerrainViewer
          exaggeration={state.terrainExaggeration}
          onExaggerationChange={state.setTerrainExaggeration}
        />
      );
    case "elevation-profile":
      return (
        <ElevationProfile
          center={state.selectedPoint}
          region={state.selectedRegion}
          locationName={state.selectedLocationName}
        />
      );
    case "image-upload":
      return (
        <ImageUpload
          previewUrl={state.previewUrl}
          onClassify={(summary, buckets, nextPreviewUrl) => {
            state.setImageSummary(summary);
            state.setUploadedClassification(buckets);
            state.setPreviewUrl(nextPreviewUrl);
          }}
        />
      );
    case "land-classifier":
      return <LandClassifier results={data.effectiveClassification} />;
    case "source-awareness":
      return <SourceAwarenessCard geodata={data.geodata} />;
    case "school-context":
      return (
        <SchoolContextCard
          schoolContext={data.schoolContext}
          loading={data.schoolLoading}
          error={data.schoolError}
        />
      );
    case "hazard-context":
      return <HazardCard geodata={data.geodata} />;
    case "climate-history":
      return <ClimateHistoryCard geodata={data.geodata} />;
    case "weather-forecast":
      return <WeatherForecastCard geodata={data.geodata} />;
    case "demographics-context":
      return <DemographicsCard geodata={data.geodata} />;
    case "broadband-context":
      return <BroadbandCard geodata={data.geodata} score={data.siteScore} />;
    case "flood-risk":
      return <FloodRiskCard geodata={data.geodata} />;
    case "cooling-water":
      return <CoolingWaterCard geodata={data.geodata} />;
    case "groundwater":
      return <GroundwaterCard geodata={data.geodata} />;
    case "soil-profile":
      return <SoilProfileCard geodata={data.geodata} />;
    case "seismic-design":
      return <SeismicDesignCard geodata={data.geodata} />;
    case "air-quality":
      return <AirQualityCard geodata={data.geodata} />;
    case "contamination-risk":
      return <ContaminationRiskCard geodata={data.geodata} />;
    case "outdoor-fit":
      return <OutdoorFitCard geodata={data.geodata} />;
    case "trip-summary":
      return (
        <TripSummaryCard geodata={data.geodata} locationName={state.selectedLocationName} />
      );
    case "earthquake-history":
      return (
        <EarthquakeHistoryCard
          geodata={data.geodata}
          lat={state.selectedPoint.lat}
          lng={state.selectedPoint.lng}
          appMode={state.appMode}
          onMarkersChange={state.setEarthquakeMarkers}
        />
      );
    case "fire-history":
      return (
        <FireHistoryCard
          geodata={data.geodata}
          lat={state.selectedPoint.lat}
          lng={state.selectedPoint.lng}
          appMode={state.appMode}
        />
      );
    case "local-access":
      return <LocalAccessCard geodata={data.geodata} />;
    case "site-readiness":
      return <SiteReadinessCard geodata={data.geodata} />;
    case "infrastructure-access":
      return <InfrastructureAccessCard geodata={data.geodata} />;
    case "multi-hazard-resilience":
      return <MultiHazardResilienceCard geodata={data.geodata} />;
    case "hazard-details":
      return <HazardDetailsCard geodata={data.geodata} />;
    case "housing-market":
      return (
        <HousingMarketCard
          locationName={state.selectedLocationName}
          housingMarket={data.housingMarket}
          loading={data.housingMarketLoading}
          error={data.housingMarketError}
        />
      );
    default:
      return null;
  }
}
