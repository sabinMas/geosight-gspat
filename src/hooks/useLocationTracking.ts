"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getCurrentLocationFix,
  getGeolocationErrorMessage,
  getGeolocationOptions,
  toUserLocationFix,
} from "@/lib/cesium-search";
import { Coordinates, DrawnShape, RouteRecordingSnapshot, UserLocationFix } from "@/types";

const LAST_KNOWN_FIX_STORAGE_KEY = "geosight:last-known-location-fix";
const ROUTE_SAMPLE_INTERVAL_MS = 3_000;

function calculateDistanceMeters(a: Coordinates, b: Coordinates) {
  const earthRadiusMeters = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function isRecentFix(fix: UserLocationFix | null, maxAgeMs: number) {
  if (!fix) {
    return false;
  }

  const timestamp = Date.parse(fix.timestamp);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= maxAgeMs;
}

function buildRecordedRouteShape(coordinates: Coordinates[]): DrawnShape | null {
  if (coordinates.length < 2) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    type: "polyline",
    coordinates,
    color: "#34d399",
    label: "Recorded route",
  };
}

function readStoredFix() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(LAST_KNOWN_FIX_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as UserLocationFix;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.coordinates ||
      typeof parsed.coordinates.lat !== "number" ||
      typeof parsed.coordinates.lng !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export interface UseLocationTrackingResult {
  currentFix: UserLocationFix | null;
  locateError: string | null;
  isLocating: boolean;
  isFollowing: boolean;
  isRecording: boolean;
  recordedRoute: Coordinates[];
  recordingSnapshot: RouteRecordingSnapshot;
  locateOnce: () => Promise<UserLocationFix | null>;
  startFollowing: () => Promise<UserLocationFix | null>;
  stopFollowing: () => void;
  startRecording: () => Promise<UserLocationFix | null>;
  stopRecording: () => DrawnShape | null;
  seedCurrentFix: (coordinates: Coordinates) => void;
  clearLocateError: () => void;
}

export function useLocationTracking(): UseLocationTrackingResult {
  const [currentFix, setCurrentFix] = useState<UserLocationFix | null>(() => readStoredFix());
  const [locateError, setLocateError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedRoute, setRecordedRoute] = useState<Coordinates[]>([]);
  const [totalDistanceMiles, setTotalDistanceMiles] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const currentFixRef = useRef<UserLocationFix | null>(currentFix);
  const followingRef = useRef(false);
  const recordingRef = useRef(false);
  const recordedRouteRef = useRef<Coordinates[]>([]);
  const totalDistanceMilesRef = useRef(0);
  const recordingStartedAtRef = useRef<number | null>(null);
  const lastRecordedAtRef = useRef<number | null>(null);

  useEffect(() => {
    currentFixRef.current = currentFix;

    if (typeof window !== "undefined" && currentFix) {
      window.sessionStorage.setItem(LAST_KNOWN_FIX_STORAGE_KEY, JSON.stringify(currentFix));
    }
  }, [currentFix]);

  useEffect(() => {
    followingRef.current = isFollowing;
  }, [isFollowing]);

  useEffect(() => {
    recordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    recordedRouteRef.current = recordedRoute;
  }, [recordedRoute]);

  useEffect(() => {
    totalDistanceMilesRef.current = totalDistanceMiles;
  }, [totalDistanceMiles]);

  useEffect(() => {
    if (!isRecording) {
      setElapsedSeconds(0);
      return;
    }

    const interval = window.setInterval(() => {
      if (recordingStartedAtRef.current === null) {
        setElapsedSeconds(0);
        return;
      }

      setElapsedSeconds(Math.max(0, Math.round((Date.now() - recordingStartedAtRef.current) / 1000)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRecording]);

  const updateFix = useCallback((fix: UserLocationFix) => {
    setCurrentFix(fix);
    currentFixRef.current = fix;
  }, []);

  const appendRoutePoint = useCallback((coordinates: Coordinates, timestampMs: number) => {
    if (!recordingRef.current) {
      return;
    }

    if (
      lastRecordedAtRef.current !== null &&
      timestampMs - lastRecordedAtRef.current < ROUTE_SAMPLE_INTERVAL_MS
    ) {
      return;
    }

    setRecordedRoute((current) => {
      const previous = current[current.length - 1];
      const next = [...current, coordinates];

      if (previous) {
        const nextMiles =
          totalDistanceMilesRef.current + calculateDistanceMeters(previous, coordinates) * 0.000621371;
        totalDistanceMilesRef.current = nextMiles;
        setTotalDistanceMiles(nextMiles);
      }

      recordedRouteRef.current = next;
      return next;
    });

    lastRecordedAtRef.current = timestampMs;
  }, []);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current === null || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  }, []);

  const ensureWatch = useCallback(() => {
    if (watchIdRef.current !== null || !navigator.geolocation) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const fix = toUserLocationFix(position);
        updateFix(fix);
        setIsLocating(false);

        if (recordingRef.current) {
          appendRoutePoint(fix.coordinates, position.timestamp);
        }
      },
      (error) => {
        setLocateError(getGeolocationErrorMessage(error));
        setIsLocating(false);

        if (!followingRef.current && !recordingRef.current) {
          stopWatch();
        }
      },
      getGeolocationOptions(),
    );
  }, [appendRoutePoint, stopWatch, updateFix]);

  const stopWatchIfIdle = useCallback((nextFollowing: boolean, nextRecording: boolean) => {
    if (!nextFollowing && !nextRecording) {
      stopWatch();
    }
  }, [stopWatch]);

  const getFreshFix = useCallback(async () => {
    if (isRecentFix(currentFixRef.current, 30_000)) {
      return currentFixRef.current;
    }

    return getCurrentLocationFix();
  }, []);

  const locateOnce = useCallback(async () => {
    setLocateError(null);
    setIsLocating(true);

    try {
      const fix = await getCurrentLocationFix();
      updateFix(fix);
      return fix;
    } catch (error) {
      setLocateError(getGeolocationErrorMessage(error));
      return null;
    } finally {
      setIsLocating(false);
    }
  }, [updateFix]);

  const startFollowing = useCallback(async () => {
    setLocateError(null);
    setIsLocating(true);

    try {
      const fix = await getFreshFix();
      if (fix) {
        updateFix(fix);
      }

      followingRef.current = true;
      setIsFollowing(true);
      ensureWatch();
      return fix;
    } catch (error) {
      setLocateError(getGeolocationErrorMessage(error));
      followingRef.current = false;
      setIsFollowing(false);
      return null;
    } finally {
      setIsLocating(false);
    }
  }, [ensureWatch, getFreshFix, updateFix]);

  const stopFollowing = useCallback(() => {
    followingRef.current = false;
    setIsFollowing(false);
    stopWatchIfIdle(false, recordingRef.current);
  }, [stopWatchIfIdle]);

  const startRecording = useCallback(async () => {
    setLocateError(null);
    setIsLocating(true);

    try {
      const fix = await getFreshFix();
      if (fix) {
        updateFix(fix);
      }

      recordingStartedAtRef.current = Date.now();
      lastRecordedAtRef.current = null;
      totalDistanceMilesRef.current = 0;
      setTotalDistanceMiles(0);
      setElapsedSeconds(0);
      recordedRouteRef.current = [];
      setRecordedRoute([]);

      recordingRef.current = true;
      setIsRecording(true);
      if (fix) {
        appendRoutePoint(fix.coordinates, Date.parse(fix.timestamp) || Date.now());
      }

      ensureWatch();
      return fix;
    } catch (error) {
      setLocateError(getGeolocationErrorMessage(error));
      recordingRef.current = false;
      setIsRecording(false);
      return null;
    } finally {
      setIsLocating(false);
    }
  }, [appendRoutePoint, ensureWatch, getFreshFix, updateFix]);

  const stopRecording = useCallback(() => {
    recordingRef.current = false;
    setIsRecording(false);
    stopWatchIfIdle(followingRef.current, false);

    const route = recordedRouteRef.current;
    const shape = buildRecordedRouteShape(route);

    recordingStartedAtRef.current = null;
    lastRecordedAtRef.current = null;
    recordedRouteRef.current = [];
    setRecordedRoute([]);
    setElapsedSeconds(0);

    if (!shape) {
      setLocateError("Record a little more movement to save a route for analysis.");
      totalDistanceMilesRef.current = 0;
      setTotalDistanceMiles(0);
      return null;
    }

    totalDistanceMilesRef.current = 0;
    setTotalDistanceMiles(0);
    return shape;
  }, [stopWatchIfIdle]);

  const seedCurrentFix = useCallback((coordinates: Coordinates) => {
    updateFix({
      coordinates,
      accuracyMeters: null,
      headingDegrees: null,
      speedMps: null,
      timestamp: new Date().toISOString(),
    });
  }, [updateFix]);

  const clearLocateError = useCallback(() => {
    setLocateError(null);
  }, []);

  useEffect(() => () => stopWatch(), [stopWatch]);

  const recordingSnapshot = useMemo<RouteRecordingSnapshot>(
    () => ({
      isRecording,
      pointCount: recordedRoute.length,
      totalDistanceMiles,
      elapsedSeconds,
    }),
    [elapsedSeconds, isRecording, recordedRoute.length, totalDistanceMiles],
  );

  return {
    currentFix,
    locateError,
    isLocating,
    isFollowing,
    isRecording,
    recordedRoute,
    recordingSnapshot,
    locateOnce,
    startFollowing,
    stopFollowing,
    startRecording,
    stopRecording,
    seedCurrentFix,
    clearLocateError,
  };
}
