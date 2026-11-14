// MainScreen answers recorded from a seam 1 run on `watchdog/tests/fixtures/archive-party` (ticket #181): the Party chip's options and a Party-filtered
// Total with its coverage (cases in `packages/api/test/recordedPartyCases.ts`, block "Party filter (#181)"). Rewritten by `RECORD_FIXTURES=1`.
import type { MainScreenQuery, MainScreenQueryVariables } from "../../generated/operations.ts";
import type { FixtureSet } from "../types.ts";
import mainScreenJson from "./party/MainScreen.json" with { type: "json" };

export const recordedPartyMainScreen = mainScreenJson as unknown as FixtureSet<MainScreenQuery, MainScreenQueryVariables>;
