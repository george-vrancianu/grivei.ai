import { Skeleton } from "../../../atoms/Skeleton/index.ts";

/** The count pill of a tab (34 x 18, fully round) as a block, in the pill's place at the end of the tab's name. */
export function PillSkeleton() {
  return <Skeleton aria-hidden="true" component="span" variant="rounded" width={34} height={18} sx={{ display: "inline-block", verticalAlign: "middle", borderRadius: "10px" }} />;
}
