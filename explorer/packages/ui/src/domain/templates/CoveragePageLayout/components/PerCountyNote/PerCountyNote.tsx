import { Link } from "../../../../../atoms/Link/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { layout } from "../../../../../theme/tokens.ts";
import { followLink } from "../../../../utils/followLink.ts";
import type { CoveragePageLayoutCopy } from "../../coveragePageLayout.types.ts";

export interface PerCountyNoteProps {
  /** Where the map's Coverage lens lives (the app supplies the locale path and the query). */
  lensHref: string;
  onNavigate?: ((href: string) => void) | undefined;
  /** The coverage Source's name as published. */
  source: string;
  /** The first year of the Source's grid. */
  since: string;
  copy: CoveragePageLayoutCopy;
}

/** The body of the "N of M" panel: how each county reads on the Coverage lens, why it is never a percentage, and the link to the lens. */
export function PerCountyNote({ lensHref, onNavigate, source, since, copy }: PerCountyNoteProps) {
  const { perCounty } = copy;
  return (
    <>
      <Typography sx={{ maxWidth: layout.titleMaxWidth }}>{perCounty.body(source, since)}</Typography>
      <Link href={lensHref} onClick={followLink(lensHref, onNavigate)} sx={{ alignSelf: "flex-start" }}>
        {perCounty.lensLink}
      </Link>
    </>
  );
}
