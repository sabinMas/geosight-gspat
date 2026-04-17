"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Coordinates, RegionSelection } from "@/types";
import type { GlobeViewMode } from "@/types";

interface MapLibreMapProps {
  selectedPoint: Coordinates;
  selectedRegion: RegionSelection;
  globeViewMode: GlobeViewMode;
  onPointSelect: (coords: Coordinates) => void;
}

const STYLE_URLS: Record<GlobeViewMode, string> = {
  road: "https://demotiles.maplibre.org/style.json",
  satellite:
    "https://demotiles.maplibre.org/style.json",
  "water-terrain":
    "https://demotiles.maplibre.org/style.json",
};

const REGION_SOURCE_ID = "selected-region";

export function MapLibreMap({
  selectedPoint,
  selectedRegion,
  globeViewMode,
  onPointSelect,
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URLS[globeViewMode] ?? STYLE_URLS.road,
      center: [selectedPoint.lng, selectedPoint.lat],
      zoom: 11,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left",
    );

    map.on("click", (e) => {
      onPointSelect({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync basemap style when view mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(STYLE_URLS[globeViewMode] ?? STYLE_URLS.road);
  }, [globeViewMode]);

  // Sync selected point marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRef.current?.remove();

    const el = document.createElement("div");
    el.style.cssText = `
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--accent, #00e5ff);
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    `;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([selectedPoint.lng, selectedPoint.lat])
      .addTo(map);

    markerRef.current = marker;
    map.easeTo({ center: [selectedPoint.lng, selectedPoint.lat], duration: 400 });
  }, [selectedPoint.lat, selectedPoint.lng]);

  // Sync region polygon overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const addRegion = () => {
      if (map.getLayer(REGION_SOURCE_ID + "-fill")) map.removeLayer(REGION_SOURCE_ID + "-fill");
      if (map.getLayer(REGION_SOURCE_ID + "-line")) map.removeLayer(REGION_SOURCE_ID + "-line");
      if (map.getSource(REGION_SOURCE_ID)) map.removeSource(REGION_SOURCE_ID);

      if (selectedRegion.polygon.length < 3) return;

      const coords = selectedRegion.polygon.map((c) => [c.lng, c.lat]);
      if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
        coords.push(coords[0]);
      }

      map.addSource(REGION_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [coords] },
        },
      });

      map.addLayer({
        id: REGION_SOURCE_ID + "-fill",
        type: "fill",
        source: REGION_SOURCE_ID,
        paint: { "fill-color": "#00e5ff", "fill-opacity": 0.07 },
      });

      map.addLayer({
        id: REGION_SOURCE_ID + "-line",
        type: "line",
        source: REGION_SOURCE_ID,
        paint: { "line-color": "#00e5ff", "line-width": 1.5, "line-opacity": 0.6 },
      });
    };

    if (map.isStyleLoaded()) {
      addRegion();
    } else {
      map.once("styledata", addRegion);
    }
  }, [selectedRegion]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      aria-label="2D map view"
      role="application"
    />
  );
}
