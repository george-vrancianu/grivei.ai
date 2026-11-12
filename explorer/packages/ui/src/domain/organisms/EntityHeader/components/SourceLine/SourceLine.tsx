import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { EntityHeaderData } from "../../../../types.ts";
import { formatFetched } from "../../entityHeader.utils.ts";

export interface SourceLineCopy {
  /** "Name and status from ANAF, fetched 12 October 2024", given the Source's id and the formatted date. */
  from: (source: string, fetched: string) => string;
}

export interface SourceLineProps {
  entity: Pick<EntityHeaderData, "provenance">;
  locale: Locale;
  copy: SourceLineCopy;
}

/** Where the name and status came from (ANAF, the Reference source, or SEAP when ANAF has no answer) and when we fetched it. */
export function SourceLine({ entity, locale, copy }: SourceLineProps) {
  if (entity.provenance.length === 0) return null;
  return (
    <Stack spacing={0.25}>
      {entity.provenance.map((p) => {
        const text = copy.from(p.source, formatFetched(p.fetchedAt, locale));
        return (
          <Typography key={`${p.source}-${p.kind}-${p.fetchedAt}`} variant="caption" color="text.secondary">
            {p.url ? (
              <Link href={p.url} target="_blank">
                {text}
              </Link>
            ) : (
              text
            )}
          </Typography>
        );
      })}
    </Stack>
  );
}
