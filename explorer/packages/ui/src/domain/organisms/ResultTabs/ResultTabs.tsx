import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Tab } from "../../../atoms/Tab/index.ts";
import { Tabs } from "../../../atoms/Tabs/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { ApproxCount } from "../../atoms/ApproxCount/index.ts";
import { EntityResultRow, type EntityResultRowCopy } from "../../molecules/EntityResultRow/index.ts";
import { GoToCard, type GoToCardCopy } from "../../molecules/GoToCard/index.ts";
import { RecordResultRow, type RecordResultRowCopy } from "../../molecules/RecordResultRow/index.ts";
import type { EntityRef, EntityResultPage, EntityRole, RecordResult, RecordResultPage } from "../../types.ts";
import { useResultTab } from "./hooks/useResultTab.ts";
import { goToRole, RESULT_TABS, type ResultTab } from "./resultTabs.utils.ts";

export interface ResultTabsCopy {
  /** The tab list's accessible name. */
  label: string;
  tabs: Record<ResultTab, string>;
  /** One sentence per tab for a tab with no rows. */
  empty: Record<ResultTab, string>;
  /** "Show all n" link text, for the optional `showAllHref`; `formatted` is the count in the locale's number format. */
  showAll: (n: number, formatted: string) => string;
  goTo: GoToCardCopy;
  entityRow: EntityResultRowCopy;
  recordRow: RecordResultRowCopy;
}

export interface ResultTabsProps {
  authorities: EntityResultPage;
  suppliers: EntityResultPage;
  records: RecordResultPage;
  /** `SeapSearch.goTo`; the pinned card shows when set. */
  goTo: EntityRef | null;
  /** The selected tab. Leave it out for an uncontrolled component that starts on Suppliers. */
  tab?: ResultTab;
  onTabChange?: (tab: ResultTab) => void;
  /** Entity page URL for an entity in a role, built by the caller (language prefix, route). */
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (record: RecordResult["record"]) => string;
  /** Where "show all" goes for a tab (the full-results view); the link shows only when it returns a URL and the tab has more rows than shown. */
  showAllHref?: (tab: ResultTab) => string | undefined;
  locale: Locale;
  copy: ResultTabsCopy;
}

const tabId = (tab: ResultTab) => `result-tab-${tab}`;
const panelId = (tab: ResultTab) => `result-tabpanel-${tab}`;
const listSx = { listStyle: "none", m: 0, p: 0, "& > li + li": { borderTop: 1, borderColor: "divider" } } as const;

/** The results of a search: a pinned "Go to page" card, then Authorities, Suppliers and Records tabs (Suppliers by default). */
export function ResultTabs(props: ResultTabsProps) {
  const { authorities, suppliers, records, goTo, locale, copy, entityHref, recordHref, showAllHref } = props;
  const [tab, select] = useResultTab(props.tab, props.onTabChange);
  const counts: Record<ResultTab, { count: number; estimated: boolean; shown: number }> = {
    authorities: { count: authorities.count, estimated: authorities.countEstimated, shown: authorities.rows.length },
    suppliers: { count: suppliers.count, estimated: suppliers.countEstimated, shown: suppliers.rows.length },
    records: { count: records.count, estimated: false, shown: records.rows.length },
  };
  const entityPages = { authorities, suppliers };
  const showAll = showAllHref?.(tab);
  const active = counts[tab];

  return (
    <Stack spacing={2}>
      {goTo && <GoToCard entity={goTo} href={entityHref(goTo, goToRole(goTo, entityPages))} copy={copy.goTo} />}
      <Tabs value={tab} onChange={(_event, next: ResultTab) => select(next)} aria-label={copy.label}>
        {RESULT_TABS.map((name) => (
          <Tab
            key={name}
            value={name}
            id={tabId(name)}
            aria-controls={panelId(name)}
            label={
              <span>
                {copy.tabs[name]} <ApproxCount count={counts[name].count} estimated={counts[name].estimated} locale={locale} />
              </span>
            }
          />
        ))}
      </Tabs>
      {RESULT_TABS.map((name) => (
        <div key={name} role="tabpanel" id={panelId(name)} aria-labelledby={tabId(name)} hidden={name !== tab}>
          {name === tab && (
            <>
              {counts[name].shown === 0 ? (
                <Typography>{copy.empty[name]}</Typography>
              ) : name === "records" ? (
                <Stack component="ul" sx={listSx}>
                  {records.rows.map((row) => (
                    <RecordResultRow key={row.record.code} row={row} recordHref={recordHref(row.record)} entityHref={entityHref} locale={locale} copy={copy.recordRow} />
                  ))}
                </Stack>
              ) : (
                <Stack component="ul" sx={listSx}>
                  {entityPages[name].rows.map((row) => (
                    <EntityResultRow
                      key={row.entity.key}
                      row={row}
                      href={entityHref(row.entity, name === "authorities" ? "authority" : "supplier")}
                      locale={locale}
                      copy={copy.entityRow}
                    />
                  ))}
                </Stack>
              )}
              {showAll && active.count > active.shown && (
                <Link href={showAll}>{copy.showAll(active.count, active.count.toLocaleString(locale === "ro" ? "ro-RO" : "en-GB"))}</Link>
              )}
            </>
          )}
        </div>
      ))}
    </Stack>
  );
}
