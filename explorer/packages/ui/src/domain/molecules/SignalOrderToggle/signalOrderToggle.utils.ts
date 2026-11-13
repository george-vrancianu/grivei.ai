import type { SignalOrder } from "@grivei/contract";

export type { SignalOrder };

/** The two orders of an entity's Signals, in the order the toggle offers them: newest first, then largest value first. There is no other order and no score. */
export const SIGNAL_ORDERS = ["DATE_DESC", "VALUE_DESC"] as const satisfies readonly SignalOrder[];
