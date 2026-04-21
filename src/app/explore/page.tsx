import { ExploreProvider } from "@/components/Explore/ExploreProvider";
import { ExploreWorkspace } from "@/components/Explore/ExploreWorkspace";
import { parseAppMode } from "@/lib/app-mode";
import { getExplorerLensById } from "@/lib/explorer-lenses";
import { ExploreInitState } from "@/types";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};

  const rawLat = firstValue(params.lat);
  const rawLng = firstValue(params.lng);

  const lensId = firstValue(params.lens);
  // If no explicit profile= param, resolve profile from the lens ID so explorer
  // lenses (e.g. trail-scout → hiking) initialise the correct profile and
  // evidence tray signals on first load.
  const profileId =
    firstValue(params.profile) ??
    (lensId ? getExplorerLensById(lensId)?.profileId : undefined);

  const initialState: ExploreInitState = {
    demoScenarioId: firstValue(params.demo),
    profileId,
    locationQuery: firstValue(params.location),
    lat: rawLat !== undefined ? Number(rawLat) : undefined,
    lng: rawLng !== undefined ? Number(rawLng) : undefined,
    entrySource: (firstValue(params.entrySource) as ExploreInitState["entrySource"]) ?? "direct",
    appMode: parseAppMode(firstValue(params.mode) ?? null),
    lensId,
  };

  return (
    <ExploreProvider initialState={initialState}>
      <ExploreWorkspace />
    </ExploreProvider>
  );
}
