import { ExploreProvider } from "@/components/Explore/ExploreProvider";
import { ExploreWorkspace } from "@/components/Explore/ExploreWorkspace";
import { normalizeProfileId } from "@/lib/lenses";
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

  const initialState: ExploreInitState = {
    profileId: normalizeProfileId(firstValue(params.profile)),
    locationQuery: firstValue(params.location),
  };

  return (
    <ExploreProvider initialState={initialState}>
      <ExploreWorkspace />
    </ExploreProvider>
  );
}
