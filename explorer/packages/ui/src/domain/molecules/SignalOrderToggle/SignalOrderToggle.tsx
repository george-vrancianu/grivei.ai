import { OptionToggle } from "../OptionToggle/index.ts";

/** The two orders of an entity's Signals: newest first, or largest value first. There is no other order and no score. */
export type SignalOrderValue = "DATE_DESC" | "VALUE_DESC";

const ORDERS = ["DATE_DESC", "VALUE_DESC"] as const satisfies readonly SignalOrderValue[];

export interface SignalOrderToggleCopy {
  /** The group's accessible name: "Order Signals". */
  label: string;
  /** "by date" and "by RON". */
  options: Record<SignalOrderValue, string>;
}

export interface SignalOrderToggleProps {
  value: SignalOrderValue;
  onChange: (value: SignalOrderValue) => void;
  copy: SignalOrderToggleCopy;
}

/** The order of the Overview's Signals list: by date or by RON, the chosen one pressed. */
export function SignalOrderToggle({ value, onChange, copy }: SignalOrderToggleProps) {
  return <OptionToggle options={ORDERS} value={value} onChange={onChange} labels={copy.options} label={copy.label} />;
}
