import { Chip } from "../../../atoms/Chip/index.ts";
import { Tooltip } from "../../../atoms/Tooltip/index.ts";
import type { RecordBadge } from "../../types.ts";
import { toneOf, type BadgeCopy } from "./badgeChip.utils.ts";

export interface BadgeChipProps {
  badge: RecordBadge;
  copy: BadgeCopy;
}

/** A Record badge as a chip; the caveat explanation is its tooltip (hover or keyboard focus) and its accessible description. */
export function BadgeChip({ badge, copy }: BadgeChipProps) {
  const { label, explanation } = copy[badge];
  const tone = toneOf(badge);
  return (
    <Tooltip title={explanation} describeChild>
      <Chip
        size="small"
        variant="outlined"
        label={label}
        tabIndex={0}
        {...(tone === "default" ? {} : { color: tone })}
      />
    </Tooltip>
  );
}
