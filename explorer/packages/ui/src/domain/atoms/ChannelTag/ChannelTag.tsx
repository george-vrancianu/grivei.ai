import { Tag } from "../Tag/index.ts";
import type { RecordResult } from "../../types.ts";

export interface ChannelTagProps {
  channel: RecordResult["record"]["channel"];
  /** The label of each channel (how the Record was awarded). */
  labels: Record<RecordResult["record"]["channel"], string>;
}

/**
 * The tag for how a Record was awarded (its channel): a `Tag` with the channel's label. Shared by the Record row and the Record page.
 */
export function ChannelTag({ channel, labels }: ChannelTagProps) {
  return <Tag>{labels[channel]}</Tag>;
}
