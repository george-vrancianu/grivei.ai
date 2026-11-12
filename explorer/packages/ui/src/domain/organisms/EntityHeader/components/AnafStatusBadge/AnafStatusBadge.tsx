import { Chip } from "../../../../../atoms/Chip/index.ts";
import { Tooltip } from "../../../../../atoms/Tooltip/index.ts";
import { isInactiveStatus } from "../../entityHeader.utils.ts";

export interface AnafStatusBadgeCopy {
  /** What the badge's accessible name starts with, e.g. "ANAF status". */
  label: string;
  /** The tooltip for a status that is not active, given the status as ANAF publishes it. */
  inactive: (status: string) => string;
}

export interface AnafStatusBadgeProps {
  /** `Entity.anafStatus`, shown as ANAF publishes it (RADIERE, FUZIUNE ...). */
  status: string | null;
  copy: AnafStatusBadgeCopy;
}

/** A badge for an ANAF status that is not active. An active entity, or one ANAF has no answer for, gets none. */
export function AnafStatusBadge({ status, copy }: AnafStatusBadgeProps) {
  if (!isInactiveStatus(status)) return null;
  return (
    <Tooltip title={copy.inactive(status)} describeChild>
      <Chip size="small" color="warning" label={`${copy.label}: ${status}`} tabIndex={0} />
    </Tooltip>
  );
}
