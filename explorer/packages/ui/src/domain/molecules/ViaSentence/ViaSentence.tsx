import { Link } from "../../../atoms/Link/index.ts";
import type { Locale } from "../../../theme/index.ts";
import type { LeadershipData } from "../../types.ts";
import { followLink } from "../../utils/followLink.ts";
import { formatDate } from "../../utils/formatDate.ts";

export interface ViaSentenceProps {
  via: NonNullable<LeadershipData["via"]>;
  /** The sentence, built around the authority's name and the formatted MF snapshot day: "via <authority>, principal credit holder, MF list snapshot <date>; funding relation, current tie". */
  sentence: (authority: string, snapshot: string) => string;
  /** The entity page of the authority. */
  href: string;
  onNavigate?: ((href: string) => void) | undefined;
  locale: Locale;
}

/** The basis of a subordinate body's Party: the sentence with the authority's name as a link, put where the copy function places the name. */
export function ViaSentence({ via, sentence, href, onNavigate, locale }: ViaSentenceProps) {
  const marker = "\u0000";
  const [before = "", after = ""] = sentence(marker, formatDate(via.snapshotDate, locale, "long")).split(marker);
  return (
    <>
      {before}
      <Link href={href} onClick={followLink(href, onNavigate)}>{via.authorityName}</Link>
      {after}
    </>
  );
}
