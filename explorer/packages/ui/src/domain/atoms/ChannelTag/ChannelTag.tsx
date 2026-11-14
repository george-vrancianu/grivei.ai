import { Box } from "../../../atoms/Box/index.ts";
import { color, radius } from "../../../theme/tokens.ts";
import type { RecordResult } from "../../types.ts";

export interface ChannelTagProps {
  channel: RecordResult["record"]["channel"];
  /** The label of each channel (how the Record was awarded). */
  labels: Record<RecordResult["record"]["channel"], string>;
}

/**
 * The tag for how a Record was awarded (its channel): a bordered box in the surrounding text's font. The label wraps instead of being cut off,
 * so a long one stays whole on a narrow screen. Shared by the Record row and the Record page.
 */
export function ChannelTag({ channel, labels }: ChannelTagProps) {
  return (
    <Box
      component="span"
      sx={{ border: `1px solid ${color.lineStrong}`, borderRadius: `${radius.chip}px`, px: 1, py: 0.25, color: "text.primary", minWidth: 0, overflowWrap: "anywhere" }}
    >
      {labels[channel]}
    </Box>
  );
}
