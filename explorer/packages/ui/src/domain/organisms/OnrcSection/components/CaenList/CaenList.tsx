import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { OnrcRegistrationData } from "../../../../types.ts";

export interface CaenListCopy {
  heading: string;
  none: string;
  /** "CAEN Rev.2" for the revision the code is from; the argument is null when ONRC records none. */
  version: (version: number | null) => string;
}

export interface CaenListProps {
  caen: OnrcRegistrationData["caen"];
  copy: CaenListCopy;
}

/** The authorised CAEN codes, by code, each with its CAEN revision. */
export function CaenList({ caen, copy }: CaenListProps) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="meta" component="h3" color="text.secondary">
        {copy.heading}
      </Typography>
      {caen.length === 0 ? (
        <Typography color="text.secondary">{copy.none}</Typography>
      ) : (
        <Stack component="ul" direction="row" spacing={2} sx={{ m: 0, p: 0, listStyle: "none", flexWrap: "wrap", rowGap: 0.5 }}>
          {caen.map((c) => (
            <Typography component="li" key={`${c.code}-${c.version}`}>
              <strong>{c.code}</strong>{" "}
              <Typography component="span" variant="body2" color="text.secondary">
                {copy.version(c.version)}
              </Typography>
            </Typography>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
