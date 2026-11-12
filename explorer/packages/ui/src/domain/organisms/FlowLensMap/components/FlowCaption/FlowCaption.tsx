import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { EntityRole } from "../../../../types.ts";
import type { FlowCaptionCopy } from "../../flowLensMap.types.ts";

export interface FlowCaptionProps {
  role: EntityRole;
  /** The entity's county name; null when it has none (or the map has no outline for it). */
  homeName: string | null;
  /** Every county that holds money is the home county (and there is one): one bubble, no arcs. Says nothing of the off-map tiles. */
  localOnly: boolean;
  copy: FlowCaptionCopy;
}

/** One sentence under the map: which way the money flows and to or from which county, or that it is all local, or that there are no arcs without a home county. Then where the off-map money is. */
export function FlowCaption({ role, homeName, localOnly, copy }: FlowCaptionProps) {
  const text = homeName === null ? copy.noHome[role] : localOnly ? copy.localOnly[role](homeName) : copy.direction[role](homeName);
  return (
    <Typography variant="caption" component="p" data-flow-caption sx={{ mt: 1, maxWidth: 520 }}>
      {text} {copy.offMap}
    </Typography>
  );
}
