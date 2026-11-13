import { OptionToggle } from "../OptionToggle/index.ts";
import { SIGNAL_ORDERS, type SignalOrder } from "./signalOrderToggle.utils.ts";

export interface SignalOrderToggleCopy {
  /** The group's accessible name: "Order Signals". */
  label: string;
  /** "by date" and "by RON". */
  options: Record<SignalOrder, string>;
}

export interface SignalOrderToggleProps {
  value: SignalOrder;
  onChange: (value: SignalOrder) => void;
  copy: SignalOrderToggleCopy;
}

/** The order of the Overview's Signals list: by date or by RON, the chosen one pressed. */
export function SignalOrderToggle({ value, onChange, copy }: SignalOrderToggleProps) {
  return <OptionToggle options={SIGNAL_ORDERS} value={value} onChange={onChange} labels={copy.options} label={copy.label} />;
}
