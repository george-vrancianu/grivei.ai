import type { BadgeCopy } from "../../../../atoms/BadgeChip/index.ts";
import { RECORD_BADGES } from "../../../../atoms/BadgeChip/index.ts";
import type { RecordBadge } from "../../../../types.ts";
import type { FilterChipsCopy } from "../../filterChips.types.ts";
import { MultiChoiceMenu } from "../../../MultiChoiceMenu/index.ts";

export interface BadgeMenuProps {
  /** The menu's name: "Badges". */
  label: string;
  selected: readonly RecordBadge[] | null | undefined;
  onToggle: (badge: RecordBadge) => void;
  /** The badge catalogue the Record rows use; each item's text is the badge's label and its explanation is the tooltip. */
  copy: BadgeCopy;
  /** "Any" / "Oricare". */
  unsetLabel: string;
  picked: FilterChipsCopy["picked"];
  /** Start open (the workbench shows an open menu this way). */
  defaultOpen?: boolean;
}

/** Every `RecordBadge` as a checkbox item (any number at once), in the order of `RECORD_BADGES`. */
export function BadgeMenu({ label, selected, onToggle, copy, unsetLabel, picked, defaultOpen }: BadgeMenuProps) {
  return (
    <MultiChoiceMenu
      label={label}
      unsetLabel={unsetLabel}
      options={RECORD_BADGES.map((badge) => ({ value: badge, label: copy[badge].label, hint: copy[badge].explanation }))}
      selected={selected}
      onToggle={onToggle}
      picked={picked}
      defaultOpen={defaultOpen}
    />
  );
}
