import { Chip } from "../../../../../atoms/Chip/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Tooltip } from "../../../../../atoms/Tooltip/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { EntityHeaderData } from "../../../../types.ts";
import { visuallyHidden } from "../../../../utils/visuallyHidden.ts";
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

/** Where the entity is placed: "UAT, county" (county alone when its UAT is not known), National, or Unplaced; and who placed it. */
export function PlacementLine({ entity, copy }: PlacementLineProps) {
  const view = placementView(entity);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <Typography variant="meta" component="span" sx={visuallyHidden}>
        {copy.label}
      </Typography>
      {view.kind === "unplaced" ? (
        <Tooltip title={copy.unplaced.explanation} describeChild>
          <Chip size="small" variant="outlined" label={copy.unplaced.label} tabIndex={0} />
        </Tooltip>
      ) : (
        <>
          <Typography variant="meta" component="span" color="text.secondary">
            {view.kind === "national" ? copy.national : view.uat ? `${view.uat}, ${view.county}` : view.county}
          </Typography>
          <Typography variant="meta" component="span">
            ({copy.placedBy(view.placedBy)})
          </Typography>
        </>
      )}
    </Stack>
  );
}
