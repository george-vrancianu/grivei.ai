import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { RecordPageData } from "../../../../types.ts";
import { formatDate } from "../../../../utils/formatDate.ts";
import { factsSx } from "../facts.ts";

type Provenance = RecordPageData["provenance"];

export interface ProvenanceSectionCopy {
  heading: string;
  source: string;
  /** The file or notice it came from. The value itself is source data and is never translated. */
  via: string;
  kind: string;
  kinds: Record<Provenance["kind"], string>;
  fetchedAt: string;
  /** "Check in SEAP", given the Source's id. */
  checkIn: (source: string) => string;
  /** Said instead of the link when the Source has no stable public page for this Record. */
  noPublicPage: (source: string) => string;
}

export interface ProvenanceSectionProps {
  provenance: Provenance;
  locale: Locale;
  copy: ProvenanceSectionCopy;
}

/** Where the Record came from: the Source, the file or notice exactly as it titles it, how we got it and when; and the link to check it there. */
export function ProvenanceSection({ provenance, locale, copy }: ProvenanceSectionProps) {
  const { source, url, via, kind, fetchedAt } = provenance;
  return (
    <Stack component="section" spacing={1} aria-label={copy.heading}>
      <Typography variant="h6" component="h2">
        {copy.heading}
      </Typography>
      <Box component="dl" sx={factsSx}>
        <dt>{copy.source}</dt>
        <dd>{source}</dd>
        {via && (
          <>
            <dt>{copy.via}</dt>
            <dd>{via}</dd>
          </>
        )}
        <dt>{copy.kind}</dt>
        <dd>{copy.kinds[kind]}</dd>
        <dt>{copy.fetchedAt}</dt>
        <dd>
          <time dateTime={fetchedAt}>{formatDate(fetchedAt, locale, "long")}</time>
        </dd>
      </Box>
      {url ? (
        <Typography>
          <Link href={url} target="_blank">
            {copy.checkIn(source)}
          </Link>
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {copy.noPublicPage(source)}
        </Typography>
      )}
    </Stack>
  );
}
