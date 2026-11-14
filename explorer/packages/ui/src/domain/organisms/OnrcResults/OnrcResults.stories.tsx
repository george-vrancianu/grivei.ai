import { fixtures } from "@grivei/contract/fixtures";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../samples/copy.ts";
import { sampleOnrcCopy } from "../../samples/onrcCopy.ts";
import type { OnrcResultData } from "../../types.ts";
import { OnrcResults } from "./index.ts";

const meta = { title: "Domain/OnrcResults" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const typical = fixtures.OnrcSearch[0]!.data.onrc.search.organisations;
const filtered = fixtures.OnrcSearch[1]!.data.onrc.search.organisations;

const list = (page: { count: number; rows: unknown[] }, extra: { page?: number; empty?: boolean } = {}): Story["render"] => (_args, { globals }) => {
  const locale = localeOf(globals["locale"]);
  return (
    <OnrcResults
      count={page.count} rows={page.rows as OnrcResultData[]} page={extra.page ?? 1} pageSize={50} pageHref={(n) => `?page=${n}`} entityHref={(e) => `/explore/supplier/${e.key}`}
      emptyHref={extra.empty ? "/explore/coverage?source=onrc" : undefined} locale={locale} copy={sampleOnrcCopy.results(locale)}
    />
  );
};

/** A name query: a hit on the registered name and a hit on an earlier name. */
export const NameAndAliasHits: Story = { render: list(typical) };
/** Chips only: an undated registration last, a registration with no county, a status the nomenclature does not name. */
export const FiltersUnplacedAndUndated: Story = { render: list(filtered) };
/** Past the first page: real page links. */
export const SecondPage: Story = { render: list({ count: 120, rows: typical.rows }, { page: 2 }) };
/** Nothing matches. */
export const Empty: Story = { render: list({ count: 0, rows: [] }, { empty: true }) };
