import { BoundingBox } from "@/types";

export async function fetchWaterObservations(bbox: BoundingBox) {
  void bbox;
  return {
    stations: [],
    note: "Water Services station lookup is stubbed for the MVP demo; proximity relies on OSM waterway context.",
  };
}
