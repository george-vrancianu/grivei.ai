import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { followLink } from "../../../../utils/followLink.ts";

export interface SignalLinksCopy {
  /** "See the 13 Records", given the count and its formatted number: the reproducing link. */
  reproduce: (n: number, formatted: string) => string;
  seap: {
    /** The link to the one Record in SEAP. */
    check: string;
    /** Said instead when the Signal has several Records (each row of the list has its own SEAP link). */
    checkEach: string;
  };
  /** The methodology link: how this Signal is detected. */
  methodology: string;
}

export interface SignalLinksProps {
  recordCount: number;
  /** The Records-tab URL that reproduces the Signal. */
  reproduceHref: string;
  /** The methodology section of this Signal's rule. */
  methodologyHref: string;
  /** The Record's page in SEAP when the Signal has exactly one Record; otherwise null or absent. */
  seapHref?: string | null;
  onNavigate?: (href: string) => void;
  locale: Locale;
  copy: SignalLinksCopy;
}

/** The three ways out of a Signal card: its Records on the Records tab, the Record in SEAP (or the advice to check each one), and the rule's methodology. */
export function SignalLinks({ recordCount, reproduceHref, methodologyHref, seapHref, onNavigate, locale, copy }: SignalLinksProps) {
  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}>
      <Link href={reproduceHref} onClick={followLink(reproduceHref, onNavigate)}>
        {copy.reproduce(recordCount, formatCount(recordCount, false, locale))}
      </Link>
      {seapHref ? (
        <Link href={seapHref} target="_blank">
          {copy.seap.check}
        </Link>
      ) : (
        <Typography component="span" color="text.secondary">
          {copy.seap.checkEach}
        </Typography>
      )}
      <Link href={methodologyHref} onClick={followLink(methodologyHref, onNavigate)}>
        {copy.methodology}
      </Link>
    </Stack>
  );
}
