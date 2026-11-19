import { Link } from "../../../atoms/Link/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { Box } from "../../../atoms/Box/index.ts";
import { DefinitionList } from "../../molecules/DefinitionList/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import type { PublicEnterpriseData } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";

export interface PublicEnterpriseSectionCopy {
  /** The section's title and the mark: "Public enterprise (AMEPIP)". */
  heading: string;
  /** The header's right slot, the Source: "AMEPIP · list of 13 January 2026", given the formatted day AMEPIP published the list. */
  aside: (published: string) => string;
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
  /** The panel shows its last answer while the next loads: its body is dimmed with `aria-busy="true"`; the header and the foot stay at full strength. */
  busy?: boolean | undefined;
}

/**
 * "Public enterprise (AMEPIP)" on an entity page with its basis: the entity's CUI appears in AMEPIP's indicator tables of the companies under OUG 109/2011 (for the financial years shown).
 * AMEPIP is a Reference source, so this is a short section on the page and not a Source of its own. The wording of the status and the
 * registration number is AMEPIP's (Romanian source data), never translated.
 */
export function PublicEnterpriseSection({ enterprise, cui, locale, copy, busy }: PublicEnterpriseSectionProps) {
  const years = enterprise.firstYear !== null && enterprise.lastYear !== null ? copy.years(enterprise.firstYear, enterprise.lastYear) : null;
  const facts: [string, string][] = [
    [copy.listedAs, enterprise.listedAs],
    ...(enterprise.registrationNumber ? ([[copy.registrationNumber, enterprise.registrationNumber]] as [string, string][]) : []),
    ...(enterprise.status ? ([[copy.status, enterprise.status]] as [string, string][]) : []),
  ];
  const published = formatDate(enterprise.snapshot, locale, "long");
  return (
    <Panel
      heading={copy.heading}
      level="h2"
      busy={busy}
      aside={copy.aside(published)}
      foot={
        <Typography variant="meta" component="span">
          {enterprise.url ? <Link href={enterprise.url} target="_blank">{copy.link}</Link> : null}
          {enterprise.url ? " · " : ""}
          {copy.fetched(formatDate(enterprise.fetchedAt, locale, "long"), enterprise.license)}
        </Typography>
      }
    >
      <Typography>{copy.basis(cui, published, years !== null)}</Typography>
      <DefinitionList compact valueSize="small">
        {facts.map(([label, value]) => (
          <Box key={label} sx={{ display: "contents" }}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </Box>
        ))}
      </DefinitionList>
      {years && <Typography variant="caption" color="text.secondary">{years}</Typography>}
    </Panel>
  );
}
