import { useId } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { radius } from "../../../../../theme/tokens.ts";
import { followLink } from "../../../../utils/followLink.ts";
import type { CoveragePageLayoutCopy } from "../../coveragePageLayout.types.ts";

export interface PerCountyNoteProps {
  /** Where the map's Coverage lens lives (the app supplies the locale path and the query). */
  lensHref: string;
  onNavigate?: ((href: string) => void) | undefined;
  copy: CoveragePageLayoutCopy;
}

/** The "N of M" block: how each county reads on the Coverage lens, why it is never a percentage, and the link to the lens. */
export function PerCountyNote({ lensHref, onNavigate, copy }: PerCountyNoteProps) {
  const id = useId();
  const { perCounty } = copy;
  return (
    <Box component="section" aria-labelledby={id} sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 1, bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: `${radius.card}px` }}>
      <Typography id={id} variant="label" component="h2" color="primary.main" sx={{ fontWeight: 500 }}>
        {perCounty.heading}
      </Typography>
      <Typography sx={{ maxWidth: 820 }}>{perCounty.body}</Typography>
      <Link href={lensHref} onClick={followLink(lensHref, onNavigate)} sx={{ alignSelf: "flex-start" }}>
        {perCounty.lensLink}
      </Link>
    </Box>
  );
}
