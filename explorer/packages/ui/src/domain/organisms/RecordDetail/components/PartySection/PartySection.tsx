import { Typography } from "../../../../../atoms/Typography/index.ts";
import { MandateBasisLine, type MandateBasisCopy } from "../../../../molecules/MandateBasisLine/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { ViaSentence } from "../../../../molecules/ViaSentence/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { RecordPartyData } from "../../../../types.ts";

export interface PartySectionCopy {
  heading: string;
  /** What the list is: the mandate in force on the award date, as registered; the leader may have switched since. */
  note: string;
  /** The basis of a subordinate body's Party, given the authority's name and the formatted MF snapshot day. */
  via: (authority: string, snapshot: string) => string;
  mandateBasis: MandateBasisCopy;
}

export interface PartySectionProps {
  party: RecordPartyData;
  authorityHref: (key: string) => string;
  onNavigate?: ((href: string) => void) | undefined;
  locale: Locale;
  copy: PartySectionCopy;
}

/** The Party of a Record: the list of the mandate in force on its award date at its authority (or, for a subordinate body, at its principal credit holder), with its basis. Never the leader's name, never a winner's. */
export function PartySection({ party, authorityHref, onNavigate, locale, copy }: PartySectionProps) {
  return (
    <Panel heading={copy.heading} level="h2">
      <Typography variant="body1">{party.list}</Typography>
      <MandateBasisLine mandate={party} locale={locale} copy={copy.mandateBasis} />
      <Typography variant="caption" color="text.secondary">{copy.note}</Typography>
      {party.via && (
        <Typography variant="caption" color="text.secondary">
          <ViaSentence via={party.via} sentence={copy.via} href={authorityHref(party.via.authority)} onNavigate={onNavigate} locale={locale} />
        </Typography>
      )}
    </Panel>
  );
}
