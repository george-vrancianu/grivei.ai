import type { EntityLinkCopy } from "../../atoms/EntityLink/index.ts";
import type { PageNavCopy } from "../../molecules/PageNav/index.ts";
import type { MoneyFlowPanelCopy } from "../MoneyFlowPanel/index.ts";
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
  /** The graph panel's title ('top counterparties · pick one to list its Records'). */
  heading: string;
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
  /** The rule for an edge's colour, in one sentence: the channel holding the most RON with that counterparty. */
  edgeColour: string;
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
  /** Legend: the whole entity's months, and the picked counterparty's (given its name, or null while the name is not known yet). */
  overall: string;
  picked: (name: string | null) => string;
  /** Sentence for no months at all. */
  empty: string;
  /** The header's right slot: the first and last month with money, already formatted ("Jan 2024 to Oct 2026"); one month when they are the same. */
  period: (from: string, to: string) => string;
  /** The line under the bars: the month with the most money and its amount, both formatted ("tallest month: July 2026, RON 672M"). */
  tallest: (month: string, amount: string) => string;
  /** The text alternative: a table of the same months. */
  table: { caption: string; month: string; amount: string; picked: (name: string | null) => string };
}

export interface CounterpartyPanelCopy {
  /** The panel's accessible name ("Records with the picked counterparty"). */
  label: string;
  /** The panel's title in the header strip ("Picked counterparty"). */
  eyebrow: string;
  /** Shown while nothing is picked. */
  hint: string;
  /** Labels of the two inset figures: the counterparty's total awarded and its Record count in the filter. */
  awarded: string;
  records: string;
  /** The Signals chip's text, shown when the counterparty carries Signals. It leads to the Records tab with only those Records. */
  signals: string;
  /** One sentence for a counterparty that won together with the entity (no names: the data does not carry them). */
  wonTogether: string;
  /** The foot's count: "4 of 25 shown", given the two formatted numbers. */
  shown: (shown: string, total: string) => string;
  /** The foot's link to every Record with it, given the Records count ("25 Records") and the counterparty's name. */
  all: (records: string, name: string) => string;
  close: string;
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

/** What the first-load skeleton shows for real: the labels of the loaded tab, over placeholder blocks. */
export interface RelationshipsTabSkeletonCopy {
  heading: string;
  graph: Pick<CounterpartyGraphCopy, "heading">;
  timeline: Pick<MonthlyTimelineCopy, "heading">;
  panel: Pick<CounterpartyPanelCopy, "label" | "eyebrow" | "hint" | "awarded" | "records">;
  /** The Money flow panel's title and meta line (the skeleton of the Money flow view). */
  flow: MoneyFlowPanelCopy;
}
