import { Typography } from "../../../../../atoms/Typography/index.ts";
import { EntityLink } from "../../../../atoms/EntityLink/index.ts";
import { PartyName, type PartyNameCopy } from "../../../../atoms/PartyName/index.ts";
import type { EntityRef, EntityRole, RecordResult } from "../../../../types.ts";

export interface RecordPartiesCopy {
  authority: string;
  winners: string;
  party: PartyNameCopy;
}

export interface RecordPartiesProps {
  record: RecordResult["record"];
  /** The entity page's URL for an authority or a winner, built by the caller. */
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  copy: RecordPartiesCopy;
}

/** "Authority: X · Winners: A, B": both sides link to their entity pages, with the name-only marker where it applies. */
export function RecordParties({ record, entityHref, copy }: RecordPartiesProps) {
  return (
    <Typography component="div" variant="body2" color="text.secondary">
      {copy.authority}: <EntityLink entity={record.authority} href={entityHref(record.authority, "authority")} copy={copy.party.entityLink} />
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
  );
}
