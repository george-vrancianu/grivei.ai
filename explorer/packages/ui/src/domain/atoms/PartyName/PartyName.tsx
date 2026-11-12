import type { Party } from "../../types.ts";
import { EntityLink, type EntityLinkCopy } from "../EntityLink/index.ts";

export interface PartyNameCopy {
  /** The natural-person supplier's label. The glossary fixes it as "Persoană fizică" in both languages. */
  naturalPerson: string;
  entityLink: EntityLinkCopy;
}

export interface PartyNameProps {
  party: Party;
  /** Entity page URL for the winner's Entity; not called for a natural person. */
  entityHref: (entity: NonNullable<Party["entity"]>) => string;
  copy: PartyNameCopy;
}

/**
 * A winner on a Record. A natural person is never named and never linked (ADR 0003):
 * only the label shows, and `publishedName` is not read at all.
 * A party with neither an Entity nor a published name renders nothing.
 */
export function PartyName({ party, entityHref, copy }: PartyNameProps) {
  if (party.naturalPerson) return <span>{copy.naturalPerson}</span>;
  if (party.entity) return <EntityLink entity={party.entity} href={entityHref(party.entity)} copy={copy.entityLink} />;
  return party.publishedName ? <span>{party.publishedName}</span> : null;
}
