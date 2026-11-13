import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { font, type as typeScale } from "../../../../../theme/tokens.ts";
import { neutralLinkSx } from "../../../../utils/neutralLinkSx.ts";
import { followLink } from "../../../../utils/followLink.ts";

export interface MethodologyContentsProps {
  /** The accessible name of the list: "On this page". */
  label: string;
  entries: readonly { anchor: string; label: string; indent?: boolean }[];
  sectionHref: (anchor: string) => string;
  onNavigate?: (href: string) => void;
}

/** A short table of contents: one link per section, to its anchor. */
export function MethodologyContents({ label, entries, sectionHref, onNavigate }: MethodologyContentsProps) {
  return (
    <Box component="nav" aria-label={label} sx={{ position: { md: "sticky" }, top: { md: 3 } }}>
      <Typography variant="meta" component="p" sx={{ m: 0 }}>
        {label}
      </Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1.5, p: 0, display: "flex", flexDirection: "column", gap: 1.25 }}>
        {entries.map(({ anchor, label: text, indent }) => (
          <Box component="li" key={anchor} sx={indent ? { ml: 2 } : undefined}>
            <Link href={sectionHref(anchor)} onClick={followLink(sectionHref(anchor), onNavigate)} variant="body2" underline="hover" sx={{ ...neutralLinkSx, fontFamily: font.mono, fontSize: typeScale.meta.size }}>
              {text}
            </Link>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
