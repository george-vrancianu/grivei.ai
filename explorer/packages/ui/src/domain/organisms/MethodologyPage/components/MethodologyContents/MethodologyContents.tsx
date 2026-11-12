import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
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
    <Box component="nav" aria-label={label}>
      <Typography variant="subtitle2" component="p">
        {label}
      </Typography>
      <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 3 }}>
        {entries.map(({ anchor, label: text, indent }) => (
          <Box component="li" key={anchor} sx={indent ? { ml: 2 } : undefined}>
            <Link href={sectionHref(anchor)} onClick={followLink(sectionHref(anchor), onNavigate)}>
              {text}
            </Link>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
