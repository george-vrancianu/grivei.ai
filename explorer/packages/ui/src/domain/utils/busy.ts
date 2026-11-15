/** The opacity of a region that shows its last answer while the next one loads (design handoff, "Refetch"). */
export const BUSY_OPACITY = 0.6;

/** The attributes of a region that shows a held answer: `aria-busy` and the dim. Nothing when it is not busy. */
export const busyProps = (busy: boolean | undefined) => (busy ? { "aria-busy": true as const, sx: { opacity: BUSY_OPACITY } } : {});
