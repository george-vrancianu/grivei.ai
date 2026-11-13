import { Chip } from "../../../../../atoms/Chip/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Tooltip } from "../../../../../atoms/Tooltip/index.ts";
import { BadgeChip, type BadgeCopy } from "../../../../atoms/BadgeChip/index.ts";
import type { RecordResult } from "../../../../types.ts";
import { isConsortium } from "../../recordResultRow.utils.ts";

export interface RecordBadgesCopy {
  /** The consortium marker: the label, and the explanation that the full value is shown. */
  consortium: { label: string; explanation: string };
  badges: BadgeCopy;
}

export interface RecordBadgesProps {
  record: RecordResult["record"];
  copy: RecordBadgesCopy;
  /** More badges after the Record's own (the Signal badges). */
  children?: React.ReactNode;
}

/** Every badge of a Record, led by the consortium marker when there is more than one winner. Renders nothing when there is none. */
export function RecordBadges({ record, copy, children }: RecordBadgesProps) {
  const consortium = isConsortium(record.winners);
  if (!consortium && record.badges.length === 0 && !children) return null;
  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
      {consortium && (
        <Tooltip title={copy.consortium.explanation} describeChild>
          <Chip size="small" variant="outlined" label={copy.consortium.label} tabIndex={0} />
        </Tooltip>
      )}
      {record.badges.map((badge) => (
        <BadgeChip key={badge} badge={badge} copy={copy.badges} />
      ))}
      {children}
    </Stack>
  );
}
