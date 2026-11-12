import { Chip } from "../../../atoms/Chip/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Tooltip } from "../../../atoms/Tooltip/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { BadgeChip, type BadgeCopy } from "../../atoms/BadgeChip/index.ts";
import { HighlightedText } from "../../atoms/HighlightedText/index.ts";
import { MoneyAmount } from "../../atoms/MoneyAmount/index.ts";
import { PartyName, type PartyNameCopy } from "../../atoms/PartyName/index.ts";
import type { EntityRef, EntityRole, MatchableField, RecordResult } from "../../types.ts";
import { isConsortium, visibleBadges } from "./recordResultRow.utils.ts";

export interface RecordResultRowCopy {
  noValue: string;
  /** The consortium marker next to the value: the label, and the explanation that the full value is shown. */
  consortium: { label: string; explanation: string };
  authority: string;
  winners: string;
  /** "Matched in title": `field` is already the language's name for the field (`fields[...]`). */
  matchedIn: (field: string) => string;
  fields: Record<MatchableField, string>;
  badges: BadgeCopy;
  party: PartyNameCopy;
}

export interface RecordResultRowProps {
  row: RecordResult;
  /** The Record page's URL, built by the caller. */
  recordHref: string;
  /** The entity page's URL for an authority or a winner, built by the caller. */
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  locale: Locale;
  copy: RecordResultRowCopy;
}

/**
 * A row of the Records tab: title (linked), the full value (a consortium marker when there is more than one winner),
 * date, badges, authority and winners, and "why it matched" with the matched text highlighted.
 */
export function RecordResultRow({ row, recordHref, entityHref, locale, copy }: RecordResultRowProps) {
  const { record, matchedField } = row;
  const consortium = isConsortium(record.winners);
  const badges = visibleBadges(record.badges, consortium);
  return (
    <Stack spacing={0.5} component="li" sx={{ py: 1.5 }}>
      <Typography component="div" variant="subtitle1">
        <Link href={recordHref}>{record.title}</Link>
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography component="span" variant="body2">
          {record.value === null ? copy.noValue : <MoneyAmount bani={record.value} locale={locale} />}
        </Typography>
        {consortium && (
          <Tooltip title={copy.consortium.explanation} describeChild>
            <Chip size="small" variant="outlined" label={copy.consortium.label} tabIndex={0} />
          </Tooltip>
        )}
        {record.date && (
          <Typography component="time" variant="body2" color="text.secondary" dateTime={record.date}>
            {formatDate(record.date, locale)}
          </Typography>
        )}
        {badges.map((badge) => (
          <BadgeChip key={badge} badge={badge} copy={copy.badges} />
        ))}
      </Stack>
      <Typography component="div" variant="body2" color="text.secondary">
        {copy.authority}: <Link href={entityHref(record.authority, "authority")}>{record.authority.displayName}</Link>
        {record.winners.length > 0 && (
          <>
            {" · "}
            {copy.winners}:{" "}
            {record.winners.map((party, index) => (
              <span key={index}>
                {index > 0 && ", "}
                <PartyName party={party} entityHref={(entity) => entityHref(entity, "supplier")} copy={copy.party} />
              </span>
            ))}
          </>
        )}
      </Typography>
      {matchedField && (
        <Typography component="div" variant="body2">
          <Typography component="span" variant="body2" color="text.secondary">
            {copy.matchedIn(copy.fields[matchedField.field])}:{" "}
          </Typography>
          <HighlightedText text={matchedField.text} highlights={matchedField.highlights} />
        </Typography>
      )}
    </Stack>
  );
}

function formatDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
