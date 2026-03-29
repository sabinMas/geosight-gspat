import { calculateDistanceKm } from "@/lib/nearby-places";
import { EXTERNAL_TIMEOUTS, fetchWithTimeout } from "@/lib/network";
import { buildSourceMeta } from "@/lib/source-metadata";
import { Coordinates, DataSourceMeta, SchoolContextResult, SchoolContextSummary, SchoolSummary } from "@/types";

const NCES_ENDPOINT =
  "https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_GEOCODE_PUBLICSCH_2425/MapServer/0/query";
const OSPI_ENROLLMENT_DATASET = "q4ba-s3jc";
const OSPI_ASSESSMENT_DATASET = "x73g-mrqp";
const SCHOOL_SEARCH_RADIUS_KM = 16;
const MAX_SCHOOLS = 8;
const WA_STATE_CODE = "WA";

type NcesFeature = {
  attributes?: {
    NCESSCH?: string;
    LEAID?: string;
    NAME?: string;
    CITY?: string;
    STATE?: string;
    NMCNTY?: string;
    LOCALE?: string;
    LAT?: number;
    LON?: number;
  };
  geometry?: {
    x?: number;
    y?: number;
  };
};

type NcesResponse = {
  features?: NcesFeature[];
};

type OspiEnrollmentRow = {
  districtname?: string;
  schoolname?: string;
  schoolorganizationid?: string;
  gradelevel?: string;
  all_students?: string;
  dataasof?: string;
};

type OspiAssessmentRow = {
  districtname?: string;
  schoolname?: string;
  schoolorganizationid?: string;
  testsubject?: string;
  gradelevel?: string;
  percent_met_tested_only?: string;
  percent_participation?: string;
  count_of_students_expected?: string;
  dataasof?: string;
};

type SchoolMatchRecord = {
  enrollmentRows: OspiEnrollmentRow[];
  assessmentRows: OspiAssessmentRow[];
};

type NcesSchool = {
  id: string;
  ncesId: string | null;
  leaId: string | null;
  name: string;
  city: string | null;
  stateCode: string | null;
  countyName: string | null;
  localeCode: string | null;
  distanceKm: number | null;
};

function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isLikelyUsSchoolCoverage(coords: Coordinates) {
  return coords.lat >= 14 && coords.lat <= 72 && coords.lng >= -179 && coords.lng <= -64;
}

function normalizeSchoolName(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bintl\b/g, "international")
    .replace(/\bint'l\b/g, "international")
    .replace(/\bk[- ]?8\b/g, "k 8")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(elementary school|middle school|high school|elementary|middle|high|academy|program|centre|center|school)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDistrictName(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(school district no|school district|district)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function quoteSocrataString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function localeLabel(localeCode: string | null | undefined) {
  if (!localeCode) {
    return null;
  }

  const localeMap: Record<string, string> = {
    "11": "Large city",
    "12": "Midsize city",
    "13": "Small city",
    "21": "Large suburb",
    "22": "Midsize suburb",
    "23": "Small suburb",
    "31": "Fringe town",
    "32": "Distant town",
    "33": "Remote town",
    "41": "Fringe rural",
    "42": "Distant rural",
    "43": "Remote rural",
  };

  return localeMap[localeCode] ?? `Locale ${localeCode}`;
}

function gradeSortValue(grade: string | null | undefined): number | null {
  switch (grade) {
    case "Pre-Kindergarten":
      return -1;
    case "Kindergarten":
    case "Half-day Kindergarten":
      return 0;
    case "1st Grade":
      return 1;
    case "2nd Grade":
      return 2;
    case "3rd Grade":
      return 3;
    case "4th Grade":
      return 4;
    case "5th Grade":
      return 5;
    case "6th Grade":
      return 6;
    case "7th Grade":
      return 7;
    case "8th Grade":
      return 8;
    case "9th Grade":
      return 9;
    case "10th Grade":
      return 10;
    case "11th Grade":
      return 11;
    case "12th Grade":
      return 12;
    default:
      return null;
  }
}

function gradeLabelFromValue(value: number) {
  if (value < 0) {
    return "PK";
  }
  if (value === 0) {
    return "K";
  }
  return String(value);
}

function buildGradeSpan(rows: OspiEnrollmentRow[]) {
  const values = rows
    .map((row) => gradeSortValue(row.gradelevel))
    .filter((grade): grade is number => grade !== null);

  if (!values.length) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? gradeLabelFromValue(min) : `${gradeLabelFromValue(min)}-${gradeLabelFromValue(max)}`;
}

function scoreFromDistance(distanceKm: number | null, idealKm: number, cutoffKm: number) {
  if (distanceKm === null) {
    return 40;
  }
  if (distanceKm <= idealKm) {
    return 100;
  }
  if (distanceKm >= cutoffKm) {
    return 18;
  }
  const ratio = 1 - (distanceKm - idealKm) / (cutoffKm - idealKm);
  return Math.round(Math.max(ratio * 100, 18));
}

function bandForSchoolScore(score: number | null) {
  if (score === null) {
    return "Unknown";
  }
  if (score >= 85) {
    return "Strong school context";
  }
  if (score >= 70) {
    return "Promising";
  }
  if (score >= 55) {
    return "Mixed";
  }
  return "Limited";
}

function buildSchoolSources(input: {
  coverageStatus: SchoolContextResult["coverageStatus"];
  now: string;
  ncesLastUpdated: string | null;
  ospiLastUpdated: string | null;
  matchedOfficialSchoolCount: number;
  hasSchools: boolean;
  score: number | null;
}): SchoolContextResult["sources"] {
  const baselineStatus: DataSourceMeta["status"] =
    input.coverageStatus === "outside_us"
      ? "unavailable"
      : input.hasSchools
        ? "live"
        : "limited";

  const officialStatus: DataSourceMeta["status"] =
    input.coverageStatus === "state_accountability_supported"
      ? "live"
      : input.coverageStatus === "outside_us"
        ? "unavailable"
        : "limited";

  return {
    baseline: buildSourceMeta({
      id: "school-baseline",
      label: "School baseline",
      provider: "NCES EDGE public school geocodes",
      status: baselineStatus,
      lastUpdated: input.ncesLastUpdated ?? input.now,
      freshness: "2024-25 school-year location inventory",
      coverage: "US public K-12 schools only",
      confidence:
        input.coverageStatus === "outside_us"
          ? "GeoSight school coverage is not yet available outside the US."
          : input.hasSchools
            ? "Direct nearby public-school locations from NCES."
            : "No nearby NCES school matches were found within the current search radius.",
    }),
    stateAccountability: buildSourceMeta({
      id: "school-state-accountability",
      label: "State accountability",
      provider: "Washington OSPI Report Card Data",
      status: officialStatus,
      lastUpdated: input.ospiLastUpdated ?? input.now,
      freshness: "2023-24 Washington report-card extracts",
      coverage: "Washington public schools only",
      confidence:
        input.coverageStatus === "state_accountability_supported"
          ? `Official Washington accountability metrics matched for ${input.matchedOfficialSchoolCount} nearby school${input.matchedOfficialSchoolCount === 1 ? "" : "s"}.`
          : "Washington official accountability is only available when the active location is in Washington and a nearby school match is found.",
    }),
    normalization: buildSourceMeta({
      id: "school-normalization",
      label: "GeoSight school context",
      provider: "GeoSight normalization layer",
      status: input.score === null ? "limited" : "derived",
      lastUpdated: input.now,
      freshness: "Derived on demand",
      coverage: "US-first; strongest in Washington for v1",
      confidence:
        input.score === null
          ? "No normalized score is shown when school coverage is unsupported or nearby matches are missing."
          : "GeoSight-derived score using nearby public-school access, baseline coverage, and Washington official metrics when available.",
    }),
  };
}

async function fetchJson<T>(url: string, revalidateSeconds: number) {
  const response = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": "GeoSight/1.0 https://geosight-gspat.vercel.app",
    },
    next: { revalidate: revalidateSeconds },
  }, EXTERNAL_TIMEOUTS.standard);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchNearbyNCESSchools(center: Coordinates): Promise<NcesSchool[]> {
  const params = new URLSearchParams({
    f: "pjson",
    where: "1=1",
    geometry: `${center.lng},${center.lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    distance: String(SCHOOL_SEARCH_RADIUS_KM),
    units: "esriSRUnit_Kilometer",
    outFields: "NCESSCH,LEAID,NAME,CITY,STATE,NMCNTY,LOCALE,LAT,LON",
    returnGeometry: "true",
  });

  const payload = await fetchJson<NcesResponse>(`${NCES_ENDPOINT}?${params.toString()}`, 60 * 60 * 24);

  const schools: NcesSchool[] = [];

  for (const feature of payload.features ?? []) {
      const lat = feature.geometry?.y ?? feature.attributes?.LAT;
      const lng = feature.geometry?.x ?? feature.attributes?.LON;
      const name = feature.attributes?.NAME ?? null;

      if (typeof lat !== "number" || typeof lng !== "number" || !name) {
        continue;
      }

      schools.push({
        id: feature.attributes?.NCESSCH ?? `${normalizeSchoolName(name)}-${lat}-${lng}`,
        ncesId: feature.attributes?.NCESSCH ?? null,
        leaId: feature.attributes?.LEAID ?? null,
        name,
        city: feature.attributes?.CITY ?? null,
        stateCode: feature.attributes?.STATE ?? null,
        countyName: feature.attributes?.NMCNTY ?? null,
        localeCode: feature.attributes?.LOCALE ?? null,
        distanceKm: Number(calculateDistanceKm(center, { lat, lng }).toFixed(1)),
      });
  }

  return schools
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    .slice(0, MAX_SCHOOLS);
}

async function queryOspiDataset<T>(datasetId: string, query: string) {
  const params = new URLSearchParams({
    $query: query.replace(/\s+/g, " ").trim(),
  });

  return fetchJson<T[]>(`https://data.wa.gov/resource/${datasetId}.json?${params.toString()}`, 60 * 60 * 24);
}

async function fetchOspiEnrollmentByDistricts(districtNames: string[]) {
  if (!districtNames.length) {
    return [] as OspiEnrollmentRow[];
  }

  const quotedDistricts = districtNames.map(quoteSocrataString).join(",");
  const query = `
    select districtname, schoolname, schoolorganizationid, gradelevel, all_students, dataasof
    where schoolyear = '2023-24'
      and organizationlevel = 'School'
      and districtname in(${quotedDistricts})
    limit 5000
  `;

  return queryOspiDataset<OspiEnrollmentRow>(OSPI_ENROLLMENT_DATASET, query);
}

async function fetchOspiAssessmentByDistricts(districtNames: string[]) {
  if (!districtNames.length) {
    return [] as OspiAssessmentRow[];
  }

  const quotedDistricts = districtNames.map(quoteSocrataString).join(",");
  const query = `
    select districtname, schoolname, schoolorganizationid, testsubject, gradelevel, percent_met_tested_only, percent_participation, count_of_students_expected, dataasof
    where schoolyear = '2023-24'
      and organizationlevel = 'School'
      and studentgrouptype = 'All'
      and studentgroup = 'All Students'
      and districtname in(${quotedDistricts})
      and testsubject in('ELA','Math')
    limit 5000
  `;

  return queryOspiDataset<OspiAssessmentRow>(OSPI_ASSESSMENT_DATASET, query);
}

function buildOspiMatchIndex(
  enrollments: OspiEnrollmentRow[],
  assessments: OspiAssessmentRow[],
) {
  const index = new Map<string, SchoolMatchRecord>();

  const ensure = (key: string) => {
    const existing = index.get(key);
    if (existing) {
      return existing;
    }

    const next: SchoolMatchRecord = {
      enrollmentRows: [],
      assessmentRows: [],
    };
    index.set(key, next);
    return next;
  };

  for (const row of enrollments) {
    const key = `${normalizeDistrictName(row.districtname)}::${normalizeSchoolName(row.schoolname)}`;
    ensure(key).enrollmentRows.push(row);
  }

  for (const row of assessments) {
    const key = `${normalizeDistrictName(row.districtname)}::${normalizeSchoolName(row.schoolname)}`;
    ensure(key).assessmentRows.push(row);
  }

  return index;
}

function pickBestMatchForSchool(
  school: NcesSchool,
  matchIndex: Map<string, SchoolMatchRecord>,
) {
  const normalizedSchoolName = normalizeSchoolName(school.name);
  const normalizedCity = normalizeDistrictName(school.city);
  const candidates = Array.from(matchIndex.entries()).filter(([key]) =>
    key.endsWith(`::${normalizedSchoolName}`),
  );

  if (!candidates.length) {
    return undefined;
  }

  if (candidates.length === 1) {
    return candidates[0]?.[1];
  }

  if (normalizedCity) {
    const cityAligned = candidates.find(([key]) => key.split("::")[0]?.includes(normalizedCity));
    if (cityAligned) {
      return cityAligned[1];
    }

    const fallbackCityAligned = candidates.find(([, record]) =>
      record.enrollmentRows.some((row) =>
        normalizeDistrictName(row.districtname).includes(normalizedCity),
      ),
    );
    if (fallbackCityAligned) {
      return fallbackCityAligned[1];
    }
  }

  return candidates[0]?.[1];
}

function aggregateOfficialMetrics(rows: OspiAssessmentRow[]) {
  let weightedProficiency = 0;
  let weightedParticipation = 0;
  let proficiencyWeight = 0;
  let participationWeight = 0;
  const subjects = new Set<string>();
  let lastUpdated: string | null = null;

  for (const row of rows) {
    const expectedCount = parseNumber(row.count_of_students_expected) ?? 0;
    const proficiency = parseNumber(row.percent_met_tested_only);
    const participation = parseNumber(row.percent_participation);

    if (row.testsubject) {
      subjects.add(row.testsubject);
    }
    if (row.dataasof) {
      lastUpdated = row.dataasof;
    }

    if (proficiency !== null && expectedCount > 0) {
      weightedProficiency += proficiency * 100 * expectedCount;
      proficiencyWeight += expectedCount;
    }

    if (participation !== null && expectedCount > 0) {
      weightedParticipation += participation * 100 * expectedCount;
      participationWeight += expectedCount;
    }
  }

  return {
    proficiencyPercent:
      proficiencyWeight > 0 ? Number((weightedProficiency / proficiencyWeight).toFixed(1)) : null,
    participationPercent:
      participationWeight > 0
        ? Number((weightedParticipation / participationWeight).toFixed(1))
        : null,
    subjectSummary: Array.from(subjects).join(", ") || null,
    lastUpdated,
  };
}

function buildSchoolScoreContext(schools: SchoolSummary[]) {
  if (!schools.length) {
    return {
      score: null,
      band: "Unknown",
      explanation: "No nearby public K-12 schools were matched in the current search radius.",
      matchedOfficialSchoolCount: 0,
    };
  }

  const nearestDistanceKm = schools[0]?.distanceKm ?? null;
  const distanceScore = scoreFromDistance(nearestDistanceKm, 1.2, SCHOOL_SEARCH_RADIUS_KM);
  const countScore = Math.min(100, 20 + schools.length * 11);
  const enrollmentCoverageRatio =
    schools.filter((school) => school.enrollment !== null).length / schools.length;
  const baselineScore = Math.round(55 + enrollmentCoverageRatio * 45);
  const matchedOfficialSchools = schools.filter((school) => school.officialMetrics !== null);
  const proficiencySchools = matchedOfficialSchools.filter(
    (school) => school.officialMetrics?.proficiencyPercent !== null,
  );

  let score: number;
  if (proficiencySchools.length) {
    const weightedOfficial = proficiencySchools.reduce(
      (acc, school) => {
        const weight = school.enrollment ?? 1;
        acc.proficiency += (school.officialMetrics?.proficiencyPercent ?? 0) * weight;
        acc.participation += (school.officialMetrics?.participationPercent ?? 0) * weight;
        acc.weight += weight;
        return acc;
      },
      { proficiency: 0, participation: 0, weight: 0 },
    );

    const proficiencyScore =
      weightedOfficial.weight > 0 ? weightedOfficial.proficiency / weightedOfficial.weight : 0;
    const participationScore =
      weightedOfficial.weight > 0 ? weightedOfficial.participation / weightedOfficial.weight : 0;

    score = Math.round(
      distanceScore * 0.35 +
        countScore * 0.2 +
        baselineScore * 0.1 +
        proficiencyScore * 0.25 +
        participationScore * 0.1,
    );
  } else {
    score = Math.round(distanceScore * 0.35 + countScore * 0.2 + baselineScore * 0.45);
  }

  if (schools.length < 2) {
    score = Math.max(score - 8, 0);
  }

  const band = bandForSchoolScore(score);
  const explanation = matchedOfficialSchools.length
    ? `GeoSight combined nearby public-school access with Washington's official accountability context for ${matchedOfficialSchools.length} matched school${matchedOfficialSchools.length === 1 ? "" : "s"}.`
    : "GeoSight used nearby public-school access and NCES baseline coverage only. No Washington official accountability match was available here, so treat this as a lighter-confidence school context read.";

  return {
    score,
    band,
    explanation,
    matchedOfficialSchoolCount: matchedOfficialSchools.length,
  };
}

function pickDistrictSeeds(nearbySchools: NcesSchool[]) {
  return Array.from(
    new Set(
      nearbySchools
        .filter((school) => school.stateCode === WA_STATE_CODE)
        .map((school) => school.name)
        .filter(Boolean)
        .map(quoteSocrataString),
    ),
  );
}

async function fetchWashingtonDistrictNames(nearbySchools: NcesSchool[]) {
  const schoolNameSeeds = pickDistrictSeeds(nearbySchools);
  if (!schoolNameSeeds.length) {
    return [] as string[];
  }

  const query = `
    select distinct districtname
    where schoolyear = '2023-24'
      and organizationlevel = 'School'
      and schoolname in(${schoolNameSeeds.join(",")})
    limit 200
  `;

  const rows = await queryOspiDataset<{ districtname?: string }>(OSPI_ENROLLMENT_DATASET, query);
  return Array.from(
    new Set(rows.map((row) => row.districtname).filter((value): value is string => Boolean(value))),
  );
}

function toSchoolSummary(school: NcesSchool, match: SchoolMatchRecord | undefined): SchoolSummary {
  const allGradesRow = match?.enrollmentRows.find((row) => row.gradelevel === "All Grades");
  const enrollment =
    parseNumber(allGradesRow?.all_students) ??
    match?.enrollmentRows.reduce((sum, row) => {
      const value = parseNumber(row.all_students);
      return value === null ? sum : sum + value;
    }, 0) ??
    null;
  const officialMetrics = match ? aggregateOfficialMetrics(match.assessmentRows) : null;

  return {
    id: school.id,
    name: school.name,
    ncesId: school.ncesId,
    districtName: match?.enrollmentRows[0]?.districtname ?? null,
    city: school.city,
    stateCode: school.stateCode,
    countyName: school.countyName,
    distanceKm: school.distanceKm,
    localeLabel: localeLabel(school.localeCode),
    enrollment: typeof enrollment === "number" ? enrollment : null,
    gradeSpan: match ? buildGradeSpan(match.enrollmentRows) : null,
    officialMetrics: officialMetrics
      ? {
          provider: "Washington OSPI",
          proficiencyPercent: officialMetrics.proficiencyPercent,
          participationPercent: officialMetrics.participationPercent,
          subjectSummary: officialMetrics.subjectSummary,
          year: "2023-24",
        }
      : null,
  };
}

export async function fetchSchoolContext(coords: Coordinates): Promise<SchoolContextResult> {
  const now = new Date().toISOString();

  if (!isLikelyUsSchoolCoverage(coords)) {
    const sources = buildSchoolSources({
      coverageStatus: "outside_us",
      now,
      ncesLastUpdated: null,
      ospiLastUpdated: null,
      matchedOfficialSchoolCount: 0,
      hasSchools: false,
      score: null,
    });

    return {
      coverageStatus: "outside_us",
      score: null,
      band: "Unknown",
      explanation: "GeoSight school-quality coverage is US-first in v1 and is not yet available for this country.",
      nearbySchoolCount: 0,
      nearestSchoolDistanceKm: null,
      matchedOfficialSchoolCount: 0,
      schools: [],
      sources,
      notes: [
        "School intelligence v1 currently supports US public K-12 schools only.",
        "Washington is the first state with official accountability fields in GeoSight.",
      ],
    };
  }

  const nearbySchools = await fetchNearbyNCESSchools(coords);

  if (!nearbySchools.length) {
    const sources = buildSchoolSources({
      coverageStatus: "no_school_matches",
      now,
      ncesLastUpdated: null,
      ospiLastUpdated: null,
      matchedOfficialSchoolCount: 0,
      hasSchools: false,
      score: null,
    });

    return {
      coverageStatus: "no_school_matches",
      score: null,
      band: "Unknown",
      explanation: "GeoSight did not find nearby public K-12 school matches within the current search radius.",
      nearbySchoolCount: 0,
      nearestSchoolDistanceKm: null,
      matchedOfficialSchoolCount: 0,
      schools: [],
      sources,
      notes: [
        "Nearby school coverage is based on NCES public school locations.",
        "Sparse rural areas may need a wider search radius in a later release.",
      ],
    };
  }

  let enrollmentRows: OspiEnrollmentRow[] = [];
  let assessmentRows: OspiAssessmentRow[] = [];
  let ospiLastUpdated: string | null = null;

  if (nearbySchools.some((school) => school.stateCode === WA_STATE_CODE)) {
    const districtNames = await fetchWashingtonDistrictNames(nearbySchools);
    if (districtNames.length) {
      [enrollmentRows, assessmentRows] = await Promise.all([
        fetchOspiEnrollmentByDistricts(districtNames),
        fetchOspiAssessmentByDistricts(districtNames),
      ]);
      ospiLastUpdated =
        assessmentRows.find((row) => row.dataasof)?.dataasof ??
        enrollmentRows.find((row) => row.dataasof)?.dataasof ??
        null;
    }
  }

  const ospiMatches = buildOspiMatchIndex(enrollmentRows, assessmentRows);
  const schools = nearbySchools.map((school) => {
    return toSchoolSummary(school, pickBestMatchForSchool(school, ospiMatches));
  });

  const schoolScoreContext = buildSchoolScoreContext(schools);
  const coverageStatus: SchoolContextResult["coverageStatus"] =
    schoolScoreContext.matchedOfficialSchoolCount > 0
      ? "state_accountability_supported"
      : "us_supported";
  const sources = buildSchoolSources({
    coverageStatus,
    now,
    ncesLastUpdated: now,
    ospiLastUpdated,
    matchedOfficialSchoolCount: schoolScoreContext.matchedOfficialSchoolCount,
    hasSchools: schools.length > 0,
    score: schoolScoreContext.score,
  });

  return {
    coverageStatus,
    score: schoolScoreContext.score,
    band: schoolScoreContext.band,
    explanation: schoolScoreContext.explanation,
    nearbySchoolCount: schools.length,
    nearestSchoolDistanceKm: schools[0]?.distanceKm ?? null,
    matchedOfficialSchoolCount: schoolScoreContext.matchedOfficialSchoolCount,
    schools,
    sources,
    notes: [
      "Nearby school geography comes from the NCES EDGE public school location service.",
      "Washington official accountability uses OSPI Report Card datasets when school matches are found.",
      "GeoSight school context is a derived score and not an official state rating.",
    ],
  };
}

export function summarizeSchoolContext(result: SchoolContextResult): SchoolContextSummary {
  return {
    coverageStatus: result.coverageStatus,
    score: result.score,
    band: result.band,
    explanation: result.explanation,
    nearbySchoolCount: result.nearbySchoolCount,
    nearestSchoolDistanceKm: result.nearestSchoolDistanceKm,
    matchedOfficialSchoolCount: result.matchedOfficialSchoolCount,
  };
}
