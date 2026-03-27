import { Coordinates, NearbyPlace, NearbyPlaceCategory } from "@/types";

export const NEARBY_PLACE_CATEGORY_LABELS: Record<NearbyPlaceCategory, string> = {
  trail: "Trails",
  hike: "Hikes",
  restaurant: "Restaurants",
  landmark: "Landmarks",
};

const PLACE_TEMPLATES: Record<
  NearbyPlaceCategory,
  Array<Pick<NearbyPlace, "name" | "summary" | "attributes">>
> = {
  trail: [
    {
      name: "Ridgeline Connector Trail",
      summary: "A moderate route that works well for users looking for elevation change, views, and a manageable trailhead approach.",
      attributes: ["Moderate difficulty", "Mixed forest terrain", "Good viewpoint potential"],
    },
    {
      name: "River Bend Trail",
      summary: "A lower-slope trail corridor closer to water features, suitable for easier access and quick outdoor recreation screening.",
      attributes: ["Easier grade", "Water-adjacent", "Good family access"],
    },
    {
      name: "Canyon Loop Path",
      summary: "A loop-format trail placeholder for comparing route variety, terrain character, and likely scenic value near the active location.",
      attributes: ["Loop route", "Terrain variety", "Good for day use"],
    },
  ],
  hike: [
    {
      name: "North Summit Hike",
      summary: "A steeper hike candidate that suggests stronger terrain and viewpoint interest, but higher access and difficulty tradeoffs.",
      attributes: ["Higher effort", "Elevation gain", "Stronger scenic upside"],
    },
    {
      name: "Meadow Traverse",
      summary: "A balanced hike option with gentler terrain and broader accessibility for users comparing recreation suitability.",
      attributes: ["Gentle terrain", "Open views", "Longer mileage"],
    },
    {
      name: "Falls Approach",
      summary: "A water-oriented hike placeholder that highlights natural feature access and a stronger destination feel.",
      attributes: ["Water feature", "Destination trail", "Visitor appeal"],
    },
  ],
  restaurant: [
    {
      name: "Compass Kitchen",
      summary: "A versatile neighborhood dining placeholder representing casual food options close to the active location.",
      attributes: ["Casual dining", "All-day service", "Local favorite feel"],
    },
    {
      name: "Map Room Bistro",
      summary: "A more destination-style restaurant placeholder suited to users exploring date-night or standout dining options.",
      attributes: ["Bistro", "Evening vibe", "Higher dwell time"],
    },
    {
      name: "Waypoint Coffee & Lunch",
      summary: "A lighter cafe-style place suitable for quick meetups, daytime visits, or remote-work-friendly stops.",
      attributes: ["Cafe", "Daytime stop", "Quick access"],
    },
  ],
  landmark: [
    {
      name: "Scenic Overlook",
      summary: "A viewpoint or lookout placeholder useful for general exploration and quick orientation around the selected place.",
      attributes: ["Viewpoint", "Quick stop", "Orientation point"],
    },
    {
      name: "Riverfront Access Point",
      summary: "A waterside access placeholder for users comparing nearby amenities, views, and simple day-use options.",
      attributes: ["Waterfront", "Short visit", "Public access feel"],
    },
    {
      name: "Historic Core",
      summary: "A central landmark placeholder that represents walkable, destination-style activity close to the active location.",
      attributes: ["Central area", "Walkable", "Activity node"],
    },
  ],
};

const RELATIVE_LOCATIONS = [
  "northwest of the selected point",
  "just east of the selected point",
  "south of the selected point",
] as const;

function shortLocationName(locationName: string) {
  return locationName.split(",")[0]?.trim() || locationName;
}

function buildDistance(coords: Coordinates, index: number) {
  const base = Math.abs(Math.sin((coords.lat + coords.lng + index) * 0.35));
  return Number((1.2 + base * (index + 2) * 3.1).toFixed(1));
}

export function buildNearbyPlaces(
  locationName: string,
  coords: Coordinates,
  category: NearbyPlaceCategory,
) {
  const locationLabel = shortLocationName(locationName);

  return PLACE_TEMPLATES[category].map((template, index) => ({
    id: `${category}-${index}`,
    name: template.name,
    category,
    distanceKm: buildDistance(coords, index),
    relativeLocation: RELATIVE_LOCATIONS[index % RELATIVE_LOCATIONS.length],
    summary: `${template.summary} This placeholder result is anchored to ${locationLabel}.`,
    attributes: template.attributes,
    source: "placeholder" as const,
  }));
}
