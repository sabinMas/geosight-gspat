"use client";

import { ReactNode } from "react";
import { ChatPanel } from "@/components/Analysis/ChatPanel";
import { ImageUpload } from "@/components/Analysis/ImageUpload";
import { LandClassifier } from "@/components/Analysis/LandClassifier";
import { MissionRunCard } from "@/components/Competition/MissionRunCard";
import { ActiveLocationCard } from "@/components/Explore/ActiveLocationCard";
import { AirQualityCard } from "@/components/Explore/AirQualityCard";
import { BroadbandCard } from "@/components/Explore/BroadbandCard";
import { ClimateHistoryCard } from "@/components/Explore/ClimateHistoryCard";
import { ContaminationRiskCard } from "@/components/Explore/ContaminationRiskCard";
import { CoolingWaterCard } from "@/components/Explore/CoolingWaterCard";
import { FloodRiskCard } from "@/components/Explore/FloodRiskCard";
import { GroundwaterCard } from "@/components/Explore/GroundwaterCard";
import { HazardCard } from "@/components/Explore/HazardCard";
import { SchoolContextCard } from "@/components/Explore/SchoolContextCard";
import { SeismicDesignCard } from "@/components/Explore/SeismicDesignCard";
import { SoilProfileCard } from "@/components/Explore/SoilProfileCard";
import { SourceAwarenessCard } from "@/components/Explore/SourceAwarenessCard";
import { AnalysisTrendsPanel } from "@/components/Results/AnalysisTrendsPanel";
import { NearbyPlacesList } from "@/components/Results/NearbyPlacesList";
import { CompareTable } from "@/components/Scoring/CompareTable";
import { FactorBreakdown } from "@/components/Scoring/FactorBreakdown";
import { ScoreCard } from "@/components/Scoring/ScoreCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExploreData } from "@/hooks/useExploreData";
import { useExploreState } from "@/hooks/useExploreState";
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
        onSaveSite={onSaveCurrentSite}
        onOpenSources={() => onOpenCard("source-awareness")}
        showSourceDetailsCta={data.showSourcePrompt}
        showCompareCta={data.showComparePrompt}
        onOpenCompare={() => onOpenCard("compare")}
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
  switch (cardId) {
    case "mission-run":
      return state.missionRunPreset ? (
        <MissionRunCard
          preset={state.missionRunPreset}
          profile={state.activeProfile}
          location={state.selectedPoint}
          locationName={state.selectedLocationName}
          geodata={data.geodata}
          dataTrends={data.locationTrends}
          nearbyPlaces={data.places}
          imageSummary={state.imageSummary}
          classification={data.effectiveClassification}
          score={data.siteScore}
          onOpenCard={onOpenCard}
          autoRun={state.init.judgeMode}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Mission run</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-[var(--muted-foreground)]">
            Open a competition story or judge-mode deep-link to run a structured GeoSight briefing.
          </CardContent>
        </Card>
      );
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
    default:
      return null;
  }
}
