import type { Total } from "../../types.ts";

/** The parts of a Total that left something out; zero parts are hidden. */
export function leftOut(total: Total) {
  return {
    suspect: total.suspectLeftOut,
    noValue: total.noValue,
    // Bani is an integer string: anything but zeros is a ceiling. No Number() on a big amount.
    hasCeilings: !/^-?0+$/.test(total.frameworkCeilings),
  };
}
