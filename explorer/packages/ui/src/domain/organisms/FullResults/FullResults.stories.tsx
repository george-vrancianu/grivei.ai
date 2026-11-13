import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { fullResultsAuthorityRows, fullResultsEstimatedAuthorities, fullResultsRecords } from "../../samples/fixtureData.ts";
import { FullResults, type FullResultsData, type FullResultsProps } from "./index.ts";

const meta = { title: "Domain/FullResults", component: FullResults } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const sample =
  (results: FullResultsData, page: number, extra: Partial<FullResultsProps> = {}): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <FullResults
        results={results}
        page={page}
        pageSize={3}
        pageHref={(n) => `/explore/search?tab=${results.tab}${n > 1 ? `&page=${n}` : ""}`}
        backHref="/explore/"
        citeUrl={`https://grivei.ai/explore/search?tab=${results.tab}${page > 1 ? `&page=${page}` : ""}`}
        entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
        recordHref={(record) => `/explore/record/${record.code}`}
        locale={locale}
        copy={sampleCopy.fullResults(locale)}
        {...extra}
      />
    );
  };

// Eight authorities in all, three to a page: pages of 3, 3 and 2.
const authorities = (rows: typeof fullResultsAuthorityRows): FullResultsData => ({
  tab: "authorities",
  page: { count: 8, countEstimated: false, rows },
});
// Eleven Records in all, four to a page: pages of 4, 4 and 3.
const records = (rows: typeof fullResultsRecords.rows): FullResultsData => ({ tab: "records", page: { count: 11, rows } });

export const AuthoritiesFirstPage: Story = { render: sample(authorities(fullResultsAuthorityRows), 1) };
export const AuthoritiesMiddlePage: Story = { render: sample(authorities(fullResultsAuthorityRows), 2) };
/** The last page holds the rest: two rows of three. */
export const AuthoritiesLastPage: Story = { render: sample(authorities(fullResultsAuthorityRows.slice(0, 2)), 3) };
/** The Records tab: the order control beside the heading, the citable address under it, the Record rows, the pager. */
export const RecordsFirstPage: Story = { render: sample(records(fullResultsRecords.rows.slice(0, 4)), 1, { pageSize: 4, order: "VALUE_DESC", onOrderChange: () => {} }) };
/** Ordered by date, newest first (the control follows the URL's `order`). */
export const RecordsByDate: Story = { render: sample(records(fullResultsRecords.rows.slice(0, 4)), 1, { pageSize: 4, order: "DATE_DESC", onOrderChange: () => {} }) };
export const RecordsMiddlePage: Story = { render: sample(records(fullResultsRecords.rows.slice(4, 8)), 2, { pageSize: 4, onOrderChange: () => {} }) };
/** The last page holds the rest: three of four (the fixture has no rows to spare, so these repeat the first page's). */
export const RecordsLastPage: Story = { render: sample(records(fullResultsRecords.rows.slice(0, 3)), 3, { pageSize: 4 }) };
/** Many pages: first, last and the neighbours of the current page, with gaps between. */
export const ManyPages: Story = {
  render: sample({ tab: "authorities", page: { ...fullResultsEstimatedAuthorities, rows: fullResultsAuthorityRows } }, 12, { pageSize: 3 }),
};
/** HyperLogLog distinct counts: "≈" before the count. */
export const EstimatedCount: Story = { render: sample({ tab: "authorities", page: fullResultsEstimatedAuthorities }, 1, { pageSize: 50 }) };
/** A single page: no page links. */
export const SinglePage: Story = { render: sample({ tab: "authorities", page: { count: 3, countEstimated: false, rows: fullResultsAuthorityRows } }, 1) };
/** A stale URL: the page is past the last, with a way back to page 1. */
export const PageOutOfRange: Story = { render: sample({ tab: "records", page: { count: 11, rows: [] } }, 9, { pageSize: 4 }) };
/** No Records match: the order control stays, the notice says so. */
export const EmptyRecords: Story = { render: sample({ tab: "records", page: { count: 0, rows: [] } }, 1, { onOrderChange: () => {} }) };
/** No Records match, with the link to the Coverage lens (county and dates kept) so the reader can check what was harvested. */
export const EmptyRecordsWithCoverageLink: Story = {
  render: sample({ tab: "records", page: { count: 0, rows: [] } }, 1, { onOrderChange: () => {}, emptyHref: "/explore/?county=RO-CJ&from=2023-01-01&to=2023-12-31&lens=coverage" }),
};
export const Empty: Story = { render: sample({ tab: "suppliers", page: { count: 0, countEstimated: false, rows: [] } }, 1) };
/** An estimated count that overshoots: the page is inside the estimated pages but holds no rows, so it reads as past the end. */
export const EstimatedCountOvershoots: Story = {
  render: sample({ tab: "authorities", page: { ...fullResultsEstimatedAuthorities, rows: [] } }, 5, { pageSize: 50 }),
};
