import { Chip } from "../../../../../atoms/Chip/index.ts";
import { Tooltip } from "../../../../../atoms/Tooltip/index.ts";
import { Fact } from "../../../../molecules/Fact/index.ts";
import { isInactiveStatus } from "../../entityHeader.utils.ts";

export interface AnafStatusBadgeCopy {
  /** The fact's label, e.g. "ANAF status". */
  label: string;
  /** The tooltip for a status that is not active, given the status as ANAF publishes it. */
  inactive: (status: string) => string;
}

export interface AnafStatusBadgeProps {
  /** `Entity.anafStatus`, shown as ANAF publishes it (ACTIV, RADIERE, FUZIUNE ...). */
  status: string | null;
  copy: AnafStatusBadgeCopy;
}

/**
 * ANAF's status, as a fact of the header's row ("ANAF status" over the status). An active status is plain text; one that is not active
 * (RADIERE, FUZIUNE ...) is an outlined badge with a tooltip saying so. An entity ANAF has no answer for gets nothing.
 */
export function AnafStatusBadge({ status, copy }: AnafStatusBadgeProps) {
  if (status === null || status.trim() === "") return null;
  return (
    <Fact label={copy.label}>
      {isInactiveStatus(status) ? (
        <Tooltip title={copy.inactive(status)} describeChild>
          <Chip size="small" variant="outlined" label={status} tabIndex={0} />
        </Tooltip>
      ) : (
        status
      )}
    </Fact>
  );
}
