import type { Party } from "../../types.ts";

/** A Record with more than one winner is a consortium: its value is the full contract value, not any member's share. */
export const isConsortium = (winners: readonly Party[]): boolean => winners.length > 1;

/** A framework ceiling is the most a framework agreement may reach, not money awarded: its value is shown but not summed. */
export const isFrameworkCeiling = (badges: readonly string[]): boolean => badges.includes("FRAMEWORK_CEILING");
