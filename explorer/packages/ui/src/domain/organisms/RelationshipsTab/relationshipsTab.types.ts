import type { EntityLinkCopy } from "../../atoms/EntityLink/index.ts";
import type { PageNavCopy } from "../../molecules/PageNav/index.ts";
import type { RecordResultRowCopy } from "../../molecules/RecordResultRow/index.ts";

/** What a node's accessible name is built from (amounts and counts arrive already formatted in the page's language). */
export interface NodeNameParts {
  name: string;
  amount: string;
  records: string;
  /** The channel split, formatted: how much came through contracts and through direct purchases. */
  contract: string;
  directPurchase: string;
  wonTogether: boolean;
  hasSignals: boolean;
  selected: boolean;
}

export interface CounterpartyGraphCopy {
  /** The graph's accessible name. */
  label: string;
  /** The natural person's label: never a name (ADR 0003). */
  naturalPerson: string;
  /** The label for money with no Entity that is not a natural person (a winner nobody could link, a Record with no winner, an unknown authority). */
  unknown: string;
  /** A node's accessible name and hover text, in full: name, money, Records, the channel split and the markers. */
  node: (parts: NodeNameParts) => string;
  /** "N more counterparties", for a graph that shows the top rows of a longer list. */
  more: (count: number, formatted: string) => string;
  /** The sentence for an entity with no counterparties in this filter. */
  empty: string;
  /** Said once when any counterparty won together with the entity: a consortium's money is split equally among its members, by convention. */
  consortiumNote: string;
}

export interface GraphLegendCopy {
  title: string;
  centre: string;
  size: string;
  contract: string;
  directPurchase: string;
  wonTogether: string;
  signals: string;
}

export interface MonthlyTimelineCopy {
  heading: string;
  /** The chart's accessible name. */
  label: string;
  /** Legend: the whole entity's months, and the picked counterparty's (given its name). */
  overall: string;
  picked: (name: string) => string;
  /** Sentence for no months at all. */
  empty: string;
  /** The text alternative: a table of the same months. */
  table: { caption: string; month: string; amount: string; picked: (name: string) => string };
}

export interface CounterpartyPanelCopy {
  /** The panel's accessible name. */
  label: string;
  /** Shown while nothing is picked. */
  hint: string;
  /** The heading's words before the counterparty's name ("Records with"). */
  heading: string;
  /** The picked counterparty's total in the filter, amounts formatted ("RON 1,200 across 4 Records"). */
  total: (amount: string, records: string) => string;
  close: string;
  loading: string;
  /** The picked counterparty has no Record in the filter. */
  empty: string;
}

export interface RelationshipsTabCopy {
  /** The tab's heading ("Relationships"). */
  heading: string;
  /** "3 Records" given the count and its formatted form: node names and the panel use it. */
  recordCount: (count: number, formatted: string) => string;
  graph: CounterpartyGraphCopy;
  legend: GraphLegendCopy;
  timeline: MonthlyTimelineCopy;
  panel: CounterpartyPanelCopy;
  entityLink: EntityLinkCopy;
  recordRow: RecordResultRowCopy;
  pagination: PageNavCopy;
}
