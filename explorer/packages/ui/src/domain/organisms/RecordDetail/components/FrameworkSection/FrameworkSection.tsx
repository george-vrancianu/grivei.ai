import type { ReactNode } from "react";
import { Button } from "../../../../../atoms/Button/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { RecordResultList } from "../../../../molecules/RecordResultList/index.ts";
import type { RecordResultRowCopy } from "../../../../molecules/RecordResultRow/index.ts";
import type { EntityRef, EntityRole, RecordPageData } from "../../../../types.ts";
import { followLink } from "../../../../utils/followLink.ts";
import { withNodes } from "../../../../utils/withNodes.tsx";
import { useShowAll } from "./hooks/useShowAll.ts";
import { subsequentView } from "./frameworkSection.utils.ts";

type FrameworkLink = NonNullable<RecordPageData["framework"]>;

export interface FrameworkSectionCopy {
  /** The region's name ("Framework agreement"). */
  heading: string;
  /** The subsequent contracts panel's title. */
  subsequentHeading: string;
  /** The header's right slot: how many subsequent contracts and their sum, given the count, its formatted number and the formatted sum. */
  subsequentAside: (n: number, formatted: string, sum: string) => string;
  /** The foot's count line: "5 of 11 shown, by value", given the two formatted numbers. */
  shown: (shown: string, total: string) => string;
  /** The button that expands the list in place when it holds every contract: "Show all 11", given the count and its formatted number. */
  showAll: (n: number, formatted: string) => string;
  /** The same button when more contracts exist than the list holds: it shows the rows fetched, "Show the first 50". */
  showFirst: (n: number, formatted: string) => string;
  showFewer: string;
  /** The link to the rest, over the fetch limit: it must not claim more than the Records tab's list shows. */
  moreLink: string;
}

export interface FrameworkSectionProps {
  framework: FrameworkLink;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (code: string) => string;
  /** The authority's Records tab, narrowed to the subsequent contracts of this framework: the link of a list cut at the fetch limit. Absent, no link. */
  moreHref?: string | undefined;
  onNavigate?: ((href: string) => void) | undefined;
  locale: Locale;
  copy: FrameworkSectionCopy & { recordRow: RecordResultRowCopy };
  /** The value panel, whose framework line and bar are the agreement's: it sits first in the region, the subsequent contracts panel follows. */
  children?: ReactNode;
  /** The subsequent contracts panel shows a held answer while the next loads. */
  busy?: boolean | undefined;
}

/**
 * The framework agreement's region: the value panel with the framework line (the children), then the subsequent contracts as their own titled panel: the count and the sum in the header,
 * Record rows flush, five by value and "5 of n shown, by value" in the foot with a button that expands the list in place up to the rows fetched. When the framework has more contracts
 * than were fetched, the foot says so ("50 of n shown, by value") and links to the Records tab.
 */
export function FrameworkSection({ framework, entityHref, recordHref, moreHref, onNavigate, locale, copy, children, busy }: FrameworkSectionProps) {
  const { expanded, toggle } = useShowAll();
  const rows = framework.subsequent;
  const view = subsequentView(rows.length, framework.subsequentCount, expanded);
  const aside = withNodes((sum) => copy.subsequentAside(view.total, formatCount(view.total, false, locale), sum), [<MoneyAmount bani={framework.subsequentReported} locale={locale} />]);
  const expandLabel = view.beyondList ? copy.showFirst(rows.length, formatCount(rows.length, false, locale)) : copy.showAll(rows.length, formatCount(rows.length, false, locale));
  return (
    <Stack component="section" spacing={3} aria-label={copy.heading}>
      {children}
      {rows.length > 0 && (
        <Panel
          heading={copy.subsequentHeading}
          level="h2"
          flush
          busy={busy}
          aside={aside}
          foot={
            view.hasFoot ? (
              <>
                <span>{copy.shown(formatCount(view.shown, false, locale), formatCount(view.total, false, locale))}</span>
                <Stack direction="row" useFlexGap sx={{ columnGap: 2, rowGap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                  {view.canExpand && (
                    <Button size="small" variant="text" aria-expanded={expanded} onClick={toggle}>
                      {expanded ? copy.showFewer : expandLabel}
                    </Button>
                  )}
                  {view.beyondList && moreHref !== undefined && (
                    <Link href={moreHref} onClick={followLink(moreHref, onNavigate)}>
                      {copy.moreLink}
                    </Link>
                  )}
                </Stack>
              </>
            ) : undefined
          }
        >
          <RecordResultList
            rows={rows.slice(0, view.shown).map((record) => ({ record, matchedField: null, areaShare: null }))}
            entityHref={entityHref}
            recordHref={(record) => recordHref(record.code)}
            onNavigate={onNavigate}
            locale={locale}
            copy={copy.recordRow}
            inset
          />
        </Panel>
      )}
    </Stack>
  );
}
