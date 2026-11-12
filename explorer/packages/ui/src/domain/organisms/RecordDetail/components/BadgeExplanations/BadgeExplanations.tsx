import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { BadgeChip, type BadgeCopy } from "../../../../atoms/BadgeChip/index.ts";
import type { RecordBadge } from "../../../../types.ts";

export interface BadgeExplanationsCopy {
  heading: string;
}

export interface BadgeExplanationsProps {
  badges: readonly RecordBadge[];
  copy: BadgeExplanationsCopy & { badges: BadgeCopy };
}

/**
 * Every badge of the Record as a chip with its explanation written out beside it. The chip's own tooltip needs hover or focus,
 * which a phone or a reader skimming the page does not have, so on this page the explanation is always visible text.
 */
export function BadgeExplanations({ badges, copy }: BadgeExplanationsProps) {
  if (badges.length === 0) return null;
  return (
    <Stack component="section" spacing={1} aria-label={copy.heading}>
      <Typography variant="h6" component="h2">
        {copy.heading}
      </Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", rowGap: 1 }}>
        {badges.map((badge) => (
          <Stack key={badge} component="li" direction="row" spacing={1.5} sx={{ alignItems: "baseline" }}>
            <BadgeChip badge={badge} copy={copy.badges} />
            <Typography variant="body2">{copy.badges[badge].explanation}</Typography>
          </Stack>
        ))}
      </Box>
    </Stack>
  );
}
