import { Box } from "../../../../../atoms/Box/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { EntityLink, type EntityLinkCopy } from "../../../../atoms/EntityLink/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import type { EntityRef, EntityRole, RecordPageData } from "../../../../types.ts";
import { formatDate } from "../../../../utils/formatDate.ts";
import { factsSx } from "../facts.ts";

export interface RecordFactsCopy {
  /** The panel's title ("The Record"). */
  heading: string;
  /** The Record's kind, spelled out per kind. */
  kinds: Record<RecordPageData["kind"], string>;
  facets: { kind: string; date: string; procedure: string; contractType: string; cpv: string };
  /** The label of the contracting authority's row. */
  authority: string;
  entityLink: EntityLinkCopy;
}

export interface RecordFactsProps {
  record: RecordPageData;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  locale: Locale;
  copy: RecordFactsCopy;
}

/** The side panel of the Record's own facts: kind, date, contracting authority (linked), procedure, contract type and CPV, the last three as published. A fact the Record does not have is left out. */
export function RecordFacts({ record, entityHref, locale, copy }: RecordFactsProps) {
  const { facets } = copy;
  return (
    <Panel heading={copy.heading} level="h2">
      <Box component="dl" sx={factsSx}>
        <dt>{facets.kind}</dt>
        <dd>{copy.kinds[record.kind]}</dd>
        {record.date && (
          <>
            <dt>{facets.date}</dt>
            <dd>
              <time dateTime={record.date}>{formatDate(record.date, locale, "long")}</time>
            </dd>
          </>
        )}
        <dt>{copy.authority}</dt>
        <dd>
          <EntityLink entity={record.authority} href={entityHref(record.authority, "authority")} copy={copy.entityLink} />
        </dd>
        {record.procedure && (
          <>
            <dt>{facets.procedure}</dt>
            <dd>{record.procedure}</dd>
          </>
        )}
        {record.contractType && (
          <>
            <dt>{facets.contractType}</dt>
            <dd>{record.contractType}</dd>
          </>
        )}
        {record.cpv && (
          <>
            <dt>{facets.cpv}</dt>
            <dd>
              {record.cpv.code} {record.cpv.description}
            </dd>
          </>
        )}
      </Box>
    </Panel>
  );
}
