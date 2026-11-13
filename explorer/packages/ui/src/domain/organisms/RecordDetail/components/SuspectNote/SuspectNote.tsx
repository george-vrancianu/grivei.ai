import { Link } from "../../../../../atoms/Link/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { withNodes } from "../../../../utils/withNodes.tsx";
import type { RecordPageData } from "../../../../types.ts";
import { followLink } from "../../../../utils/followLink.ts";

type SuspectFlag = NonNullable<RecordPageData["suspect"]>;

export interface SuspectNoteCopy {
  heading: string;
  /** Per rule, the published rule in neutral words, given the formatted threshold (null when the rule has none). */
  rules: Record<SuspectFlag["rule"], (threshold: string | null) => string>;
  /** "The value is shown as published and left out of totals." */
  leftOut: string;
  methodology: string;
}

export interface SuspectNoteProps {
  suspect: SuspectFlag;
  methodologyHref: string;
  onNavigate?: (href: string) => void;
  locale: Locale;
  copy: SuspectNoteCopy;
}

/** Which rule flagged the value and its threshold, from the published catalogue, with the methodology link. */
export function SuspectNote({ suspect, methodologyHref, onNavigate, locale, copy }: SuspectNoteProps) {
  const { threshold } = suspect;
  return (
    <Panel heading={copy.heading} level="h2">
      <Typography>{withNodes((amount) => copy.rules[suspect.rule](threshold === null ? null : amount), [threshold === null ? null : <MoneyAmount bani={threshold} locale={locale} showBani />])}</Typography>
      <Typography variant="body2" color="text.secondary">
        {copy.leftOut}{" "}
        <Link href={methodologyHref} onClick={followLink(methodologyHref, onNavigate)}>
          {copy.methodology}
        </Link>
      </Typography>
    </Panel>
  );
}
