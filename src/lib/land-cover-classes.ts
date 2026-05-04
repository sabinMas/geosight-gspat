/**
 * ESA CCI UN-LCCS Land Cover Classification Scheme
 * Maps class codes (0-230+) to human-readable names and visualization colors.
 * Reference: ESA Climate Change Initiative Land Cover Classification System
 * Based on UN-LCCS scheme for global consistency.
 */

export interface LandCoverClass {
  name: string;
  color: string;
}

export const ESA_CCI_CLASSES: Record<number, LandCoverClass> = {
  0: { name: "No data", color: "#ffffff" },
  10: { name: "Cropland rainfed", color: "#ffff00" },
  11: { name: "Cropland rainfed - herbaceous", color: "#ffff00" },
  12: { name: "Cropland rainfed - tree/shrub", color: "#ffcc00" },
  20: { name: "Cropland irrigated", color: "#ffff99" },
  30: { name: "Mosaic cropland (>50%) / natural vegetation", color: "#ffff66" },
  40: { name: "Mosaic natural vegetation (>50%) / cropland", color: "#ffff99" },
  50: { name: "Tree cover broadleaf evergreen", color: "#003300" },
  60: { name: "Tree cover broadleaf deciduous", color: "#006600" },
  61: { name: "Tree cover broadleaf deciduous - closed", color: "#006600" },
  62: { name: "Tree cover broadleaf deciduous - open", color: "#339933" },
  70: { name: "Tree cover needleleaf evergreen", color: "#003300" },
  71: { name: "Tree cover needleleaf evergreen - closed", color: "#003300" },
  72: { name: "Tree cover needleleaf evergreen - open", color: "#336633" },
  80: { name: "Tree cover mixed", color: "#009900" },
  81: { name: "Tree cover mixed - closed", color: "#009900" },
  82: { name: "Tree cover mixed - open", color: "#33cc33" },
  90: { name: "Mosaic tree/shrub (>50%) / herbaceous", color: "#99cc00" },
  100: { name: "Mosaic herbaceous (>50%) / tree/shrub", color: "#ffcc00" },
  110: { name: "Shrubland", color: "#cc9900" },
  120: { name: "Sparse vegetation", color: "#cccccc" },
  121: { name: "Sparse shrubland", color: "#ffcc99" },
  122: { name: "Sparse herbaceous", color: "#ffff99" },
  130: { name: "Sparse vegetation - grassland", color: "#ffff99" },
  140: { name: "Grassland", color: "#ffff00" },
  150: { name: "Lichens/mosses", color: "#999999" },
  151: { name: "Lichen/moss sparse", color: "#cccccc" },
  152: { name: "Lichen/moss dense", color: "#999999" },
  160: { name: "Sparse herbaceous/lichen/moss", color: "#cccccc" },
  170: { name: "Herbaceous wetland", color: "#00ffff" },
  180: { name: "Moss/lichen wetland", color: "#00ccff" },
  190: { name: "Herbaceous tidal", color: "#00ffcc" },
  200: { name: "Water", color: "#0000ff" },
  201: { name: "Water - permanent", color: "#0000ff" },
  202: { name: "Water - seasonal", color: "#6699ff" },
  210: { name: "Urban area", color: "#ff0000" },
  220: { name: "Bare rock", color: "#999999" },
  221: { name: "Bare rock - consolidated", color: "#888888" },
  222: { name: "Bare rock - unconsolidated", color: "#aaaaaa" },
  230: { name: "Bare soil", color: "#cccccc" },
  240: { name: "Bare rock/sand/snow mix", color: "#dddddd" },
  250: { name: "Herbaceous/sparse vegetation transition", color: "#ffff99" },
};

/**
 * Get land cover class metadata by code.
 * Returns a default "Unknown" entry if code is not found.
 */
export function getLandCoverClass(classCode: number): LandCoverClass {
  return (
    ESA_CCI_CLASSES[classCode] || {
      name: `Unknown (${classCode})`,
      color: "#e0e0e0",
    }
  );
}

/**
 * Categorize UN-LCCS class into broader functional groups.
 * Useful for summary displays.
 */
export function categorizeLandCover(classCode: number): string {
  const className = getLandCoverClass(classCode).name.toLowerCase();

  if (
    className.includes("crop") ||
    className.includes("agricultural") ||
    className.includes("cultivated")
  ) {
    return "Cropland";
  }
  if (className.includes("tree") || className.includes("forest")) {
    return "Forest";
  }
  if (
    className.includes("shrub") ||
    className.includes("herbaceous") ||
    className.includes("grass")
  ) {
    return "Grassland/Shrubland";
  }
  if (className.includes("water") || className.includes("wetland")) {
    return "Water/Wetland";
  }
  if (className.includes("urban")) {
    return "Urban";
  }
  if (className.includes("bare") || className.includes("rock") || className.includes("sand")) {
    return "Bare/Sparse";
  }

  return "Other";
}
