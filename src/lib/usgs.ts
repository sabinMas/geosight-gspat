import { Coordinates } from "@/types";

export async function fetchElevation(coords: Coordinates) {
  const url = `https://epqs.nationalmap.gov/v1/json?x=${coords.lng}&y=${coords.lat}&units=Meters&wkid=4326&includeDate=false`;
  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!response.ok) {
    throw new Error("USGS elevation request failed.");
  }

  const data = (await response.json()) as { value?: number };
  return typeof data.value === "number" ? data.value : null;
}
