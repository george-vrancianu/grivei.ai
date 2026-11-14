import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import type { LeadershipData } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";

type Mandate = LeadershipData["mandates"][number];

export interface MandateBasisCopy {
  /** The list is "Independent": which is not a party. */
  independent: string;
  /** An alliance under its registered name, with its member parties when the table has them (a list of names). */
  alliance: (members: string[]) => string;
  /** The basis per kind, given the formatted election day and, for the one-off 2025 file, the formatted day its data runs through. */
  basis: {
    finalMinutes: (election: string) => string;
    repeatRound: (election: string) => string;
    partialMinutes: (election: string, through: string) => string;
  };
}

export interface MandateBasisLineProps {
  mandate: Pick<Mandate, "independent" | "memberParties" | "basis" | "electionDate" | "dataThrough">;
  locale: Locale;
  copy: MandateBasisCopy;
}

/** One line under a list: "Independent (not a party)" or the alliance's member parties, and the basis: which AEP file and which election. Shared by the Leadership list and a Record's Party. */
export function MandateBasisLine({ mandate, locale, copy }: MandateBasisLineProps) {
  const election = formatDate(mandate.electionDate, locale, "long");
  const basis =
    mandate.basis === "FINAL_MINUTES" ? copy.basis.finalMinutes(election)
    : mandate.basis === "REPEAT_ROUND" ? copy.basis.repeatRound(election)
    : copy.basis.partialMinutes(election, formatDate(mandate.dataThrough, locale, "long"));
  const note = mandate.independent ? copy.independent : mandate.memberParties.length > 0 ? copy.alliance(mandate.memberParties) : null;
  return (
    <Typography variant="caption" color="text.secondary">
      {note ? `${note} · ` : ""}{basis}
    </Typography>
  );
}
