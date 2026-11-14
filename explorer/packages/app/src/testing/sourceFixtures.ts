import { fixtures } from "@grivei/contract/fixtures";
import type { ExtraFixture } from "./fixtureClient.ts";

/**
 * Test-local answers for what an app screen asks of the Source that the contract has no fixture for (the picker's count of the other Source, an ONRC coverage with no window).
 * They are the recorded and hand-written fixtures' own data, under the variables the screen sends: no new numbers are invented here.
 */
const onrcTypical = fixtures.OnrcSearch.find((f) => f.name === "typical-name-and-alias-hits")!;
const seapTextQuery = fixtures.MainScreen.find((f) => f.name === "text-query")!;
const onrcCoverage = fixtures.OnrcCoverage.find((f) => f.name === "typical-snapshots-and-a-known-gap")!;

/** The picker's ONRC count for a query, from the typical ONRC answer (2 registrations). */
export const onrcCountFor = (q: string): ExtraFixture => ({ operation: "OnrcSearch", variables: { filter: { q }, limit: 50, offset: 0 }, data: onrcTypical.data });
/** The picker's SEAP count for a query, from the recorded text query (8 Records). */
export const seapCountFor = (q: string): ExtraFixture => ({ operation: "MainScreen", variables: { filter: { q } }, data: seapTextQuery.data });
/** ONRC's whole coverage (no window), from the hand-written typical one: two snapshots and a month with none. */
export const onrcWholeCoverage: ExtraFixture = { operation: "OnrcCoverage", variables: {}, data: onrcCoverage.data };
export const SEAP_TEXT_QUERY_RECORDS = seapTextQuery.data.seap.search.total.records;
export const ONRC_TYPICAL_COUNT = onrcTypical.data.onrc.search.count;
