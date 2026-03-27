import { BoundingBox } from "@/types";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

export async function fetchNearbyInfrastructure(bbox: BoundingBox) {
  const query = `
    [out:json][timeout:20];
    (
      way["highway"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["power"~"line|minor_line"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      relation["waterway"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    out tags center 20;
  `;

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    body: query,
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!response.ok) {
    throw new Error("Overpass request failed.");
  }

  return (await response.json()) as {
    elements?: Array<{
      type: string;
      tags?: Record<string, string>;
      center?: { lat: number; lon: number };
    }>;
  };
}
