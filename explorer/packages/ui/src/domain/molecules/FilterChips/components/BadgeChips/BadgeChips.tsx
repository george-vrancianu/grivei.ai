import type { BadgeCopy } from "../../../../atoms/BadgeChip/index.ts";
import { RECORD_BADGES } from "../../../../atoms/BadgeChip/index.ts";
import type { RecordBadge } from "../../../../types.ts";
import { ChipGroup } from "../../../ChipGroup/index.ts";
import { ToggleChip } from "../../../ToggleChip/index.ts";

export interface BadgeChipsProps {
  label: string;
  selected: readonly RecordBadge[] | null | undefined;
  onToggle: (badge: RecordBadge) => void;
  /** The badge catalogue the Record rows use; each chip's label is the badge's label and its explanation is the tooltip. */
  copy: BadgeCopy;
}

/** Every `RecordBadge` as a toggle chip (any number at once), in the order of `RECORD_BADGES`. */
export function BadgeChips({ label, selected, onToggle, copy }: BadgeChipsProps) {
  return (
    <ChipGroup label={label}>
      {RECORD_BADGES.map((badge) => (
        <ToggleChip
          key={badge}
          size="small"
          label={copy[badge].label}
          description={copy[badge].explanation}
          pressed={(selected ?? []).includes(badge)}
          onToggle={() => onToggle(badge)}
        />
      ))}
    </ChipGroup>
  );
}
