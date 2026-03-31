export const LENS_LABELS = {
  residential: "Residential Development",
  commercial: "Commercial / Warehouse",
  infrastructure: "Data Center Cooling",
  hiking: "Hiking / Recreation",
} as const;

export type PublicLensId = keyof typeof LENS_LABELS;

const PUBLIC_TO_PROFILE_ID = {
  residential: "residential",
  commercial: "commercial",
  infrastructure: "data-center",
  hiking: "hiking",
  "data-center": "data-center",
} as const;

const PROFILE_TO_PUBLIC_LENS_ID = {
  residential: "residential",
  commercial: "commercial",
  hiking: "hiking",
  "data-center": "infrastructure",
} as const;

export function normalizeProfileId(profileId?: string | null) {
  if (!profileId) {
    return undefined;
  }

  const normalized = profileId.trim().toLowerCase();
  return PUBLIC_TO_PROFILE_ID[normalized as keyof typeof PUBLIC_TO_PROFILE_ID] ?? normalized;
}

export function toPublicLensId(profileId?: string | null): PublicLensId | undefined {
  const normalized = normalizeProfileId(profileId);
  if (!normalized) {
    return undefined;
  }

  return PROFILE_TO_PUBLIC_LENS_ID[
    normalized as keyof typeof PROFILE_TO_PUBLIC_LENS_ID
  ] as PublicLensId | undefined;
}

export function getLensLabel(profileId?: string | null) {
  const publicLensId = toPublicLensId(profileId);
  return publicLensId ? LENS_LABELS[publicLensId] : "";
}

export function toLensParam(profileId?: string | null) {
  return toPublicLensId(profileId);
}
