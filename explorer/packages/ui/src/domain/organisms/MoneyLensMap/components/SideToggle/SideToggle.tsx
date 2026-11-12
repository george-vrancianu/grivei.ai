import { OptionToggle } from "../../../../molecules/OptionToggle/index.ts";
import type { CountySide, SideToggleCopy } from "../../moneyLensMap.types.ts";

export interface SideToggleProps {
  side: CountySide;
  onSideChange: (side: CountySide) => void;
  copy: SideToggleCopy;
}

const SIDES = ["AUTHORITY", "SUPPLIER"] as const satisfies readonly CountySide[];

/** Authority or supplier: which side of the money the counties show. */
export function SideToggle({ side, onSideChange, copy }: SideToggleProps) {
  return <OptionToggle options={SIDES} value={side} onChange={onSideChange} labels={{ AUTHORITY: copy.authority, SUPPLIER: copy.supplier }} label={copy.label} />;
}
