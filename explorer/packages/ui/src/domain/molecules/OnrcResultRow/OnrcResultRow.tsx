import type { OnrcMatchableField } from "@grivei/contract";
import { Box } from "../../../atoms/Box/index.ts";
import { Chip } from "../../../atoms/Chip/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { HighlightedText } from "../../atoms/HighlightedText/index.ts";
import type { OnrcResultData } from "../../types.ts";
import { followLink } from "../../utils/followLink.ts";
import { formatDate } from "../../utils/formatDate.ts";

export interface OnrcResultRowCopy {
  /** The label before the registration number in the meta line: "Reg. no.". */
  registrationNumber: string;
  /** The label before the CUI: "CUI". */
  cui: string;
  /** "registered 10 March 2015", given the formatted date. */
  registered: (date: string) => string;
  /** The legacy snapshot layout carries no registration date. */
  registrationDateUnknown: string;
  /** The registration has no county (it is in the Unplaced tile). */
  noCounty: string;
  /** The chip on an organisation that is an authority or supplier of a loaded SEAP Record. */
  seapCounterparty: string;
  /** The label before the CAEN codes. */
  caen: string;
  /** A status code the held nomenclature does not name. */
  statusUnnamed: (code: number) => string;
  /** "Matched in earlier name": `field` is already the language's name for the field. */
  matchedIn: (field: string) => string;
  fields: Record<OnrcMatchableField, string>;
}

export interface OnrcResultRowProps {
  row: OnrcResultData;
  /** The entity page of the registration's organisation, built by the caller; absent = the name is plain text (no entity page, or none to link from here). */
  href?: string | undefined;
  locale: Locale;
  copy: OnrcResultRowCopy;
  onNavigate?: ((href: string) => void) | undefined;
}

/**
 * A row of ONRC's Organisations tab: the registered name (linked to the entity page when there is one), a mono meta line (registration number, CUI, legal
 * form, registration date, seat), ONRC's statuses (as published, a registration can carry several), the authorised CAEN codes, a chip for a SEAP counterparty and
 * the matched text of each field the query hit. ONRC's words are source data and stay as published.
 */
export function OnrcResultRow({ row, href, locale, copy, onNavigate }: OnrcResultRowProps) {
  const nameHit = row.matched.find((m) => m.field === "NAME");
  const name = nameHit ? <HighlightedText text={nameHit.text} highlights={nameHit.highlights} /> : row.name;
  const seat = [row.seat.locality, row.seat.county].filter(Boolean).join(", ") || copy.noCounty;
  const date = row.registrationDate ? copy.registered(formatDate(row.registrationDate, locale, "long")) : copy.registrationDateUnknown;
  const meta = [`${copy.registrationNumber} ${row.registrationNumber}`, ...(row.cui ? [`${copy.cui} ${row.cui}`] : []), ...(row.legalForm ? [row.legalForm] : []), date, seat];
  return (
    <Box component="li" sx={{ py: 1.5 }}>
      <Stack spacing={0.5}>
        <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", alignItems: "center", columnGap: 1.5, rowGap: 0.5 }}>
          <Typography component="div" variant="subtitle1" sx={{ fontWeight: 600 }}>
            {href ? (
              <Link href={href} onClick={followLink(href, onNavigate)}>
                {name}
              </Link>
            ) : (
              name
            )}
          </Typography>
          {row.seapCounterparty && <Chip size="small" variant="outlined" label={copy.seapCounterparty} />}
        </Stack>
        <Typography component="div" variant="caption">
          {meta.join(" · ")}
        </Typography>
        {row.statuses.length > 0 && (
          <Stack direction="row" useFlexGap spacing={0.5} sx={{ flexWrap: "wrap" }}>
            {row.statuses.map((status) => (
              <Chip key={status.code} size="small" label={status.name ?? copy.statusUnnamed(status.code)} />
            ))}
          </Stack>
        )}
        {row.caen.length > 0 && (
          <Typography component="div" variant="caption">
            {copy.caen} {row.caen.map((c) => c.code).join(", ")}
          </Typography>
        )}
        {row.matched
          .filter((m) => m.field !== "NAME")
          .map((m) => (
            <Typography key={`${m.field}:${m.text}`} component="div" variant="meta" color="text.secondary">
              {copy.matchedIn(copy.fields[m.field])}: <HighlightedText text={m.text} highlights={m.highlights} />
            </Typography>
          ))}
      </Stack>
    </Box>
  );
}
