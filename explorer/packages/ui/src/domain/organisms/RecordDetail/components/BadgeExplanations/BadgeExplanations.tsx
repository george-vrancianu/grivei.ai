import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
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
    <Panel heading={copy.heading} level="h2">
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", rowGap: 1 }}>
        {badges.map((badge) => (
          <Stack key={badge} component="li" direction="row" useFlexGap sx={{ alignItems: "baseline", flexWrap: "wrap", columnGap: 1.5, rowGap: 0.5 }}>
            <BadgeChip badge={badge} copy={copy.badges} />
            <Typography variant="body2">{copy.badges[badge].explanation}</Typography>
          </Stack>
        ))}
      </Box>
    </Panel>
  );
}
