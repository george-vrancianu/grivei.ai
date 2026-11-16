import { Chip } from "../../../../../atoms/Chip/index.ts";
import { Tooltip } from "../../../../../atoms/Tooltip/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { color } from "../../../../../theme/tokens.ts";
import { Fact } from "../../../../molecules/Fact/index.ts";
import type { EntityHeaderData } from "../../../../types.ts";
import { placementView } from "../../entityHeader.utils.ts";

export interface PlacementLineCopy {
  /** The label before the place, e.g. "Location". */
  label: string;
  national: string;
  /** Neither ANAF nor SEAP places the entity in a county. */
  unplaced: { label: string; explanation: string };
  /** Which Source placed it, e.g. "placed by ANAF". */
  placedBy: (source: string) => string;
}

export interface PlacementLineProps {
  entity: Pick<EntityHeaderData, "placement">;
  copy: PlacementLineCopy;
}

/** Where the entity is placed, as a fact: "UAT, county" (county alone when its UAT is not known), National, or Unplaced; and, in mono muted, who placed it. */
export function PlacementLine({ entity, copy }: PlacementLineProps) {
  const view = placementView(entity);
  return (
    <Fact label={copy.label}>
      {view.kind === "unplaced" ? (
        <Tooltip title={copy.unplaced.explanation} describeChild>
          <Chip size="small" variant="outlined" label={copy.unplaced.label} tabIndex={0} />
        </Tooltip>
      ) : (
        <>
          {view.kind === "national" ? copy.national : view.uat ? `${view.uat}, ${view.county}` : view.county}{" "}
          <Typography variant="meta" component="span" sx={{ color: color.muted }}>
            ({copy.placedBy(view.placedBy)})
          </Typography>
        </>
      )}
    </Fact>
  );
}
