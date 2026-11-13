import { Chip } from "../../../../../atoms/Chip/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Tooltip } from "../../../../../atoms/Tooltip/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { MarkerText } from "../../../../atoms/EntityLink/index.ts";
import type { EntityHeaderData } from "../../../../types.ts";

export interface IdentityMarkersCopy {
  /** The label before the CUI, e.g. "CUI". */
  cui: string;
  foreignVatId: string;
  /** A name-only supplier says so (glossary: Name-only supplier). */
  nameOnly: MarkerText;
  identityCurated: MarkerText;
}

export interface IdentityMarkersProps {
  entity: Pick<EntityHeaderData, "identity" | "cui" | "foreignVatId" | "identityCurated">;
  copy: IdentityMarkersCopy;
}

function Marker({ label, explanation }: MarkerText) {
  return (
    <Tooltip title={explanation} describeChild>
      <Chip size="small" variant="outlined" label={label} tabIndex={0} />
    </Tooltip>
  );
}

/** How the entity is identified: its CUI, a foreign VAT id, "identified by name only", and the curated-identity marker. */
export function IdentityMarkers({ entity, copy }: IdentityMarkersProps) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
      {entity.cui && (
        <Typography variant="meta" component="span" color="text.secondary">
          {copy.cui} <strong>{entity.cui}</strong>
        </Typography>
      )}
      {entity.foreignVatId && (
        <Typography variant="meta" component="span" color="text.secondary">
          {copy.foreignVatId} <strong>{entity.foreignVatId}</strong>
        </Typography>
      )}
      {entity.identity === "NAME_ONLY" && <Marker {...copy.nameOnly} />}
      {entity.identityCurated && <Marker {...copy.identityCurated} />}
    </Stack>
  );
}
