import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { layout } from "../../../../../theme/tokens.ts";
import { BadgeChip, type BadgeCopy } from "../../../../atoms/BadgeChip/index.ts";
import { ChannelTag } from "../../../../atoms/ChannelTag/index.ts";
import type { RecordPageData } from "../../../../types.ts";
import { visuallyHidden } from "../../../../utils/visuallyHidden.ts";

export interface RecordHeadingCopy {
  /** The Record's kind (DA, DAN, CONTRACT, AWARD_NOTICE), shown as a row of the "the Record" panel. */
  kinds: Record<RecordPageData["kind"], string>;
  facets: { code: string; date: string; kind: string; procedure: string; contractType: string; cpv: string };
  /** The title of the "the Record" panel beside the page. */
  panel: string;
}

export interface RecordHeadingProps {
  record: RecordPageData;
  copy: RecordHeadingCopy & { badges: BadgeCopy; /** The label of each channel, as on the Record row. */ channel: Record<RecordPageData["channel"], string> };
  /** The actions under the title (Check in SEAP, the citable URL). */
  children?: ReactNode;
}

/**
 * Over the title: the channel as a tag (as on the Record row), the code and the caveat badges; then the title as the page heading (as published) and the actions.
 * The kind, date, procedure, contract type and CPV are in the "the Record" panel.
 */
export function RecordHeading({ record, copy, children }: RecordHeadingProps) {
  return (
    <Stack component="header" spacing={2}>
      <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", alignItems: "center", columnGap: 1.5, rowGap: 1 }}>
        <Typography variant="meta" component="span" sx={{ minWidth: 0 }}>
          <ChannelTag channel={record.channel} labels={copy.channel} />
        </Typography>
        <Typography variant="meta" component="span">
          <Box component="span" sx={visuallyHidden}>
            {copy.facets.code}:{" "}
          </Box>
          {record.code}
        </Typography>
        {record.badges.map((badge) => (
          <BadgeChip key={badge} badge={badge} copy={copy.badges} />
        ))}
      </Stack>
      <Typography variant="h1" sx={{ maxWidth: layout.titleMaxWidth, overflowWrap: "anywhere" }}>
        {record.title}
      </Typography>
      {children}
    </Stack>
  );
}
