import { Skeleton } from "../../atoms/Skeleton/index.ts";

/** A decorative placeholder block for a skeleton (hidden from assistive technology; the skeleton's loading status is what is announced). */
export const skeletonBlock = (width: number | string, height: number) => <Skeleton aria-hidden="true" variant="rounded" width={width} height={height} />;
