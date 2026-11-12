import { useId } from "react";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Tab } from "../../../atoms/Tab/index.ts";
import { Tabs } from "../../../atoms/Tabs/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import type { EntityResultRowCopy } from "../../molecules/EntityResultRow/index.ts";
import { EntityResultList } from "../../molecules/EntityResultList/index.ts";
import { GoToCard, type GoToCardCopy } from "../../molecules/GoToCard/index.ts";
import { RecordResultList } from "../../molecules/RecordResultList/index.ts";
import type { RecordResultRowCopy } from "../../molecules/RecordResultRow/index.ts";
import type { EntityRef, EntityResultPage, EntityRole, GoToEntity, RecordResult, RecordResultPage } from "../../types.ts";
import { ResultTabPanel } from "./components/ResultTabPanel/index.ts";
import { TabLabel } from "./components/TabLabel/index.ts";
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
  goTo: GoToEntity | null;
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

/** The results of a search: a pinned "Go to page" card, then Authorities, Suppliers and Records tabs (Suppliers by default). */
export function ResultTabs(props: ResultTabsProps) {
  const { authorities, suppliers, records, goTo, locale, copy, entityHref, recordHref, showAllHref } = props;
  const [tab, select] = useResultTab(props.tab, props.onTabChange);
  const uid = useId();
  const tabId = (name: ResultTab) => `${uid}-tab-${name}`;
  const panelId = (name: ResultTab) => `${uid}-tabpanel-${name}`;
  const counts: Record<ResultTab, { count: number; estimated: boolean; shown: number }> = {
    authorities: { count: authorities.count, estimated: authorities.countEstimated, shown: authorities.rows.length },
    suppliers: { count: suppliers.count, estimated: suppliers.countEstimated, shown: suppliers.rows.length },
    records: { count: records.count, estimated: false, shown: records.rows.length },
  };
  const showAllLink = (name: ResultTab) => {
    const href = showAllHref?.(name);
    return href === undefined ? undefined : { href, text: copy.showAll(counts[name].count, formatCount(counts[name].count, false, locale)) };
  };
  const rows = {
    authorities: <EntityResultList rows={authorities.rows} role="authority" entityHref={entityHref} locale={locale} copy={copy.entityRow} />,
    suppliers: <EntityResultList rows={suppliers.rows} role="supplier" entityHref={entityHref} locale={locale} copy={copy.entityRow} />,
    records: <RecordResultList rows={records.rows} entityHref={entityHref} recordHref={recordHref} locale={locale} copy={copy.recordRow} />,
  };

  return (
    <Stack spacing={2}>
      {goTo && <GoToCard entity={goTo} href={entityHref(goTo, goToRole(goTo.seap.roles))} copy={copy.goTo} />}
      <Tabs value={tab} onChange={(_event, next: ResultTab) => select(next)} aria-label={copy.label}>
        {RESULT_TABS.map((name) => (
          <Tab
            key={name}
            value={name}
            id={tabId(name)}
            aria-controls={panelId(name)}
            label={<TabLabel name={copy.tabs[name]} count={counts[name].count} estimated={counts[name].estimated} locale={locale} />}
          />
        ))}
      </Tabs>
      {RESULT_TABS.map((name) => (
        <ResultTabPanel
          key={name}
          id={panelId(name)}
          tabId={tabId(name)}
          selected={name === tab}
          shown={counts[name].shown}
          count={counts[name].count}
          emptyText={copy.empty[name]}
          showAll={showAllLink(name)}
        >
          {rows[name]}
        </ResultTabPanel>
      ))}
    </Stack>
  );
}
