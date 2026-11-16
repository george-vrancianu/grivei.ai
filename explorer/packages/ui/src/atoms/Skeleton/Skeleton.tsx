import { forwardRef } from "react";
import MuiSkeleton, { type SkeletonProps as MuiSkeletonProps } from "@mui/material/Skeleton";

export type SkeletonProps = MuiSkeletonProps;

/** Wraps MUI Skeleton; every MUI prop, `sx` and ref passes through. The theme gives it the `raised` fill and a `line` shimmer that stops under reduced motion. A placeholder is decoration: the caller hides it from assistive technology (`aria-hidden`) and says "loading" in a status line. */
export const Skeleton = forwardRef<HTMLSpanElement, SkeletonProps>(function Skeleton(props, ref) {
  return <MuiSkeleton ref={ref} {...props} />;
});
