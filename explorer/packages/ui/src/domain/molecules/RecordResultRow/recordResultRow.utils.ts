import type { Party } from "../../types.ts";

/** A Record with more than one winner is a consortium: its value is the full contract value, not any member's share. */
export const isConsortium = (winners: readonly Party[]): boolean => winners.length > 1;
