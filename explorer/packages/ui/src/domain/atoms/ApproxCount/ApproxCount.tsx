import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "./approxCount.utils.ts";

export interface ApproxCountProps {
  count: number;
  /** True when `count` is an estimate (e.g. `EntityResultPage.countEstimated`): shown with a leading "≈". */
  estimated: boolean;
  locale: Locale;
}

/** A count in the active language's number format; "≈" first when it is an estimate. */
export function ApproxCount({ count, estimated, locale }: ApproxCountProps) {
  return <span>{formatCount(count, estimated, locale)}</span>;
}
