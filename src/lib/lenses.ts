export const LENS_LABELS = {
  "home-buying": "Home Buying",
  "site-development": "Residential Site Development",
  commercial: "Commercial / Warehouse",
  infrastructure: "Data Center Cooling",
  hiking: "Hiking / Recreation",
} as const;

export type PublicLensId = keyof typeof LENS_LABELS;

const PUBLIC_TO_PROFILE_ID = {
  residential: "site-development",
  "home-buying": "home-buying",
  "site-development": "site-development",
  commercial: "commercial",
  infrastructure: "data-center",
  hiking: "hiking",
  "data-center": "data-center",
} as const;

const PROFILE_TO_PUBLIC_LENS_ID = {
  "home-buying": "home-buying",
  "site-development": "site-development",
  commercial: "commercial",
  hiking: "hiking",
  "data-center": "infrastructure",
} as const;

const LEGACY_PROFILE_ID_MAP = {
  residential: "site-development",
} as const;

export function normalizeProfileId(profileId?: string | null) {
  if (!profileId) {
    return undefined;
  }

  const normalized = profileId.trim().toLowerCase();
  return (
    PUBLIC_TO_PROFILE_ID[normalized as keyof typeof PUBLIC_TO_PROFILE_ID] ??
    LEGACY_PROFILE_ID_MAP[normalized as keyof typeof LEGACY_PROFILE_ID_MAP] ??
    normalized
  );
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
