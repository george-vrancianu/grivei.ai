import type { ReactNode } from "react";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { SectionHeading } from "../../../../atoms/SectionHeading/index.ts";
import { RecordResultList } from "../../../../molecules/RecordResultList/index.ts";
import type { RecordResultRowCopy } from "../../../../molecules/RecordResultRow/index.ts";
import type { EntityRef, EntityRole, RecordPageData } from "../../../../types.ts";

type FrameworkLink = NonNullable<RecordPageData["framework"]>;

export interface FrameworkSectionCopy {
  /** The region's name ("Framework agreement"). */
  heading: string;
  subsequentHeading: string;
}

export interface FrameworkSectionProps {
  framework: FrameworkLink;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (code: string) => string;
  locale: Locale;
  copy: FrameworkSectionCopy & { recordRow: RecordResultRowCopy };
  /** The value card, whose framework line and bar are the agreement's: it sits first in the region, the subsequent contracts follow. */
  children?: ReactNode;
}

/** The framework agreement's region: the value card with the framework line (the children), then the list of subsequent contracts on the agreement as Record rows. */
export function FrameworkSection({ framework, entityHref, recordHref, locale, copy, children }: FrameworkSectionProps) {
  return (
    <Stack component="section" spacing={3} aria-label={copy.heading}>
      {children}
      {framework.subsequent.length > 0 && (
        <Stack spacing={1}>
          <SectionHeading>{copy.subsequentHeading}</SectionHeading>
          <RecordResultList
            rows={framework.subsequent.map((record) => ({ record, matchedField: null, areaShare: null }))}
            entityHref={entityHref}
            recordHref={(record) => recordHref(record.code)}
            locale={locale}
            copy={copy.recordRow}
          />
        </Stack>
      )}
    </Stack>
  );
}
