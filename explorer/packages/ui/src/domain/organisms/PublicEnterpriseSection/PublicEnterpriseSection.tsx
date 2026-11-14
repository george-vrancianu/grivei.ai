import { Link } from "../../../atoms/Link/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import type { PublicEnterpriseData } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";

export interface PublicEnterpriseSectionCopy {
  /** The section's title and the mark: "Public enterprise (AMEPIP)". */
  heading: string;
  /** The basis in one sentence, given the formatted day AMEPIP published the list and whether the years are shown below it: why the entity is marked. */
  basis: (cui: string, published: string, withYears: boolean) => string;
  /** The label of each fact AMEPIP's row gives; the values are source data, shown as published. */
  listedAs: string;
  registrationNumber: string;
  status: string;
  /** "Financial years 2019–2024" (or a single year), given the first and the last. */
  years: (first: number, last: number) => string;
  /** "Fetched 14 November 2026 from data.gov.ro, licence CC-BY-4.0", given the formatted day and the licence (null when the portal names none). */
  fetched: (fetched: string, license: string | null) => string;
  /** The link text to AMEPIP's indicator tables on data.gov.ro. */
  link: string;
}

export interface PublicEnterpriseSectionProps {
  /** `PublicEnterpriseFields` of the entity query. */
  enterprise: PublicEnterpriseData;
  /** The entity's CUI: the basis of the match. */
  cui: string;
  locale: Locale;
  copy: PublicEnterpriseSectionCopy;
}

/**
 * "Public enterprise (AMEPIP)" on an entity page with its basis: the entity's CUI appears in AMEPIP's indicator tables of the companies under OUG 109/2011 (for the financial years shown).
 * AMEPIP is a Reference source, so this is a short section on the page and not a Source of its own. The wording of the status and the
 * registration number is AMEPIP's (Romanian source data), never translated.
 */
export function PublicEnterpriseSection({ enterprise, cui, locale, copy }: PublicEnterpriseSectionProps) {
  const years = enterprise.firstYear !== null && enterprise.lastYear !== null ? copy.years(enterprise.firstYear, enterprise.lastYear) : null;
  const facts: [string, string][] = [
    [copy.listedAs, enterprise.listedAs],
    ...(enterprise.registrationNumber ? ([[copy.registrationNumber, enterprise.registrationNumber]] as [string, string][]) : []),
    ...(enterprise.status ? ([[copy.status, enterprise.status]] as [string, string][]) : []),
  ];
  return (
    <Panel heading={copy.heading} level="h2">
      <Typography>{copy.basis(cui, formatDate(enterprise.snapshot, locale, "long"), years !== null)}</Typography>
      <Stack component="dl" spacing={0.5} sx={{ m: 0 }}>
        {facts.map(([label, value]) => (
          <Stack key={label} direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Typography component="dt" variant="caption" color="text.secondary">{label}</Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0 }}>{value}</Typography>
          </Stack>
        ))}
      </Stack>
      {years && <Typography variant="caption" color="text.secondary">{years}</Typography>}
      <Typography variant="caption" color="text.secondary">
        {enterprise.url ? <Link href={enterprise.url} target="_blank">{copy.link}</Link> : null}
        {enterprise.url ? " · " : ""}
        {copy.fetched(formatDate(enterprise.fetchedAt, locale, "long"), enterprise.license)}
      </Typography>
    </Panel>
  );
}
