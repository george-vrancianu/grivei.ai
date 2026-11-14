// Sample copy and data for the Leadership list and a Record's Party (stories and tests), in both languages. The real strings are the app's catalogue (`entityPage.leadership`, `recordPage.party`).
import type { Locale } from "../../theme/index.ts";
import type { MandateBasisCopy } from "../molecules/MandateBasisLine/index.ts";
import type { LeadershipSectionCopy } from "../organisms/LeadershipSection/index.ts";
import type { PartySectionCopy } from "../organisms/RecordDetail/components/PartySection/index.ts";
import type { LeadershipData, RecordPartyData } from "../types.ts";

export const mandateBasisCopy: Record<Locale, MandateBasisCopy> = {
  en: {
    independent: "Independent (not a party)",
    alliance: (members) => `alliance; member parties: ${members.join(", ")}`,
    basis: {
      finalMinutes: (election) => `AEP final minutes, election of ${election}`,
      repeatRound: (election) => `AEP repeat round of ${election}`,
      partialMinutes: (election, through) => `AEP partial election of ${election}; partial counts from a one-off file (Code for Romania's backup), data through ${through}`,
    },
  },
  ro: {
    independent: "Independent (nu este partid)",
    alliance: (members) => `alianță; partide membre: ${members.join(", ")}`,
    basis: {
      finalMinutes: (election) => `procesele-verbale finale AEP, alegerile din ${election}`,
      repeatRound: (election) => `turul de repetare AEP din ${election}`,
      partialMinutes: (election, through) => `alegeri parțiale AEP din ${election}; rezultate parțiale dintr-un fișier unic (copia Code for Romania), date până la ${through}`,
    },
  },
};

export const leadershipCopy: Record<Locale, LeadershipSectionCopy> = {
  en: {
    heading: "Leadership list",
    caveat: "Each list is the one the leader was elected on, as registered at that election. A leader may have switched party since: this is not current party membership. Leaders are never linked to a person page.",
    inForce: "in force",
    period: (from, to) => `${from} – ${to}`,
    gapHeading: "Gaps (no Mandate, never guessed)",
    gaps: {
      HANDOVER_WINDOW: "Handover window: the previous mandates ended on 27 September 2024 and the new oaths followed (AEP publishes no per-UAT oath dates)",
      INTERIM: "Interim leader after a vacancy, until the partial election winner's oath",
      NO_RESULTS: "Mandate without results: AEP's minutes give no winner for this authority",
    },
    via: (authority, snapshot) => `Shown through ${authority}, principal credit holder, MF list snapshot ${snapshot}; funding relation, current tie.`,
    mandateBasis: mandateBasisCopy.en,
  },
  ro: {
    heading: "Lista conducerii",
    caveat: "Fiecare listă este cea pe care a fost ales liderul, așa cum a fost înscrisă la alegeri. Un lider își poate fi schimbat partidul de atunci: nu este apartenența actuală la un partid. Liderii nu sunt niciodată legați de o pagină de persoană.",
    inForce: "în funcție",
    period: (from, to) => `${from} – ${to}`,
    gapHeading: "Goluri (fără mandat, niciodată presupuse)",
    gaps: {
      HANDOVER_WINDOW: "Fereastra de predare: mandatele anterioare au încetat la 27 septembrie 2024, iar noile jurăminte au urmat (AEP nu publică date de depunere a jurământului pe UAT)",
      INTERIM: "Lider interimar după o vacanță, până la jurământul câștigătorului alegerilor parțiale",
      NO_RESULTS: "Mandat fără rezultate: procesele-verbale AEP nu dau un câștigător pentru această autoritate",
    },
    via: (authority, snapshot) => `Afișată prin ${authority}, ordonator principal de credite, lista MF din ${snapshot}; relație de finanțare, legătură actuală.`,
    mandateBasis: mandateBasisCopy.ro,
  },
};

export const partyCopy: Record<Locale, PartySectionCopy> = {
  en: {
    heading: "Party",
    note: "The list of the mandate in force on the award date, as registered at the election. The leader may have switched party since.",
    via: (authority, snapshot) => `Through ${authority}, principal credit holder, MF list snapshot ${snapshot}; funding relation, current tie.`,
    mandateBasis: mandateBasisCopy.en,
  },
  ro: {
    heading: "Partid",
    note: "Lista mandatului în funcție la data atribuirii, așa cum a fost înscrisă la alegeri. Liderul își poate fi schimbat partidul de atunci.",
    via: (authority, snapshot) => `Prin ${authority}, ordonator principal de credite, lista MF din ${snapshot}; relație de finanțare, legătură actuală.`,
    mandateBasis: mandateBasisCopy.ro,
  },
};

const mandate = (leaderName: string, list: string, electionDate: string, startDate: string, endDate: string | null, extra: Partial<LeadershipData["mandates"][number]> = {}): LeadershipData["mandates"][number] => ({
  leaderName, list, independent: false, memberParties: [], electionDate, basis: "FINAL_MINUTES", dataThrough: electionDate, startDate, endDate, ...extra,
});

/** A town hall: a party switch (the same leader on two lists), an alliance before, the handover window as a gap. */
export const leadership: LeadershipData = {
  mandates: [
    mandate("POPESCU ION", "PARTIDUL SOCIAL DEMOCRAT", "2020-09-27", "2020-10-27", "2024-09-27"),
    mandate("POPESCU ION", "PARTIDUL NAȚIONAL LIBERAL", "2024-06-09", "2024-10-27", null),
  ],
  gaps: [{ startDate: "2024-09-27", endDate: "2024-10-27", kind: "HANDOVER_WINDOW" }],
  via: null,
};
/** A commune with an alliance, an independent, a partial election, an interim gap and a mandate without results. */
export const leadershipWithGaps: LeadershipData = {
  mandates: [
    mandate("MARIN ANA", "ALIANȚA USR PLUS", "2020-09-27", "2020-10-27", "2024-09-27", { memberParties: ["PARTIDUL USR", "PARTIDUL LIBERTATE UNITATE SI SOLIDARITATE"] }),
    mandate("TOMA LUCIAN", "Independent", "2024-06-09", "2024-10-27", "2025-09-08", { independent: true }),
    mandate("DOBRE SORIN", "PARTIDUL NAȚIONAL LIBERAL", "2025-12-07", "2026-01-06", null, { basis: "PARTIAL_MINUTES", dataThrough: "2025-12-09" }),
  ],
  gaps: [
    { startDate: "2024-09-27", endDate: "2024-10-27", kind: "HANDOVER_WINDOW" },
    { startDate: "2025-09-08", endDate: "2026-01-06", kind: "INTERIM" },
    { startDate: "2020-10-27", endDate: "2020-11-10", kind: "NO_RESULTS" },
  ],
  via: null,
};
/** A subordinate body: its authority's list, with the basis of the tie. */
export const leadershipVia: LeadershipData = {
  ...leadership,
  via: { authority: "51000501", authorityName: "MUNICIPIUL BRASOV", snapshotDate: "2026-12-01", snapshots: 2 },
};

export const recordParty: RecordPartyData = { list: "PARTIDUL NAȚIONAL LIBERAL", independent: false, memberParties: [], electionDate: "2024-06-09", basis: "FINAL_MINUTES", dataThrough: "2024-06-09", via: null };
export const recordPartyVia: RecordPartyData = { ...recordParty, via: { authority: "51000501", authorityName: "MUNICIPIUL BRASOV", snapshotDate: "2026-12-01", snapshots: 2 } };
export const recordPartyIndependent: RecordPartyData = { ...recordParty, list: "Independent", independent: true };
