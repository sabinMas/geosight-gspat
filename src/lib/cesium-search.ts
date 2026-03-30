"use client";

import {
  Cartographic,
  Ion,
  IonGeocoderService,
  Math as CesiumMath,
  Rectangle,
} from "cesium";
import { Coordinates, LocationSearchResult } from "@/types";

let geocoder: IonGeocoderService | null = null;

function ensureCesiumToken() {
  Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "";
}

function createGeocoderSceneStub() {
  return {
    frameState: {
      creditDisplay: {
        addStaticCredit: () => undefined,
      },
    },
  } as never;
}

function getGeocoder() {
  if (geocoder) {
    return geocoder;
  }

  ensureCesiumToken();
  geocoder = new IonGeocoderService({
    scene: createGeocoderSceneStub(),
    accessToken: process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "",
  });

  return geocoder;
}

export function parseCoordinates(value: string): Coordinates | null {
  const match = value.match(/(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)/);
  if (!match) {
    return null;
  }

  const lat = Number(match[1]);
  const lng = Number(match[3]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  return { lat, lng };
}

function toCoordinates(destination: Cartographic) {
  return {
    lat: CesiumMath.toDegrees(destination.latitude),
    lng: CesiumMath.toDegrees(destination.longitude),
  };
}

export async function resolveLocationQuery(query: string): Promise<LocationSearchResult> {
  const trimmedQuery = query.trim();
  const coordinates = parseCoordinates(trimmedQuery);

  if (coordinates) {
    return {
      name: `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`,
      coordinates,
      kind: "coordinates",
    };
  }

  const results = await getGeocoder().geocode(trimmedQuery);
  const match = results[0];

  if (!match) {
    throw new Error("No results found for that search.");
  }

  const cartographic =
    match.destination instanceof Rectangle
      ? Rectangle.center(match.destination)
      : Cartographic.fromCartesian(match.destination);

  return {
    name: match.displayName,
    coordinates: toCoordinates(cartographic),
    kind: "ion-geocoder",
  };
}

export async function getCurrentCoordinates() {
  return new Promise<Coordinates>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location access was denied. Type a place instead."));
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(new Error("Reading your current location took too long. Type a place instead."));
          return;
        }

        reject(new Error("Unable to read your current location."));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  });
}
