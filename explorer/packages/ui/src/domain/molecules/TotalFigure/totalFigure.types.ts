/** Copy that depends on a count: gets the number (for plural rules) and its locale-formatted text. */
export type CountCopy = (count: number, formatted: string) => string;

export interface TotalFigureCopy {
  /** "9 Records", "≈ 2.4M Records" */
  records: CountCopy;
  /** "1 Record left out as a suspect value" */
  suspectLeftOut: CountCopy;
  /** "5 Records with no value" */
  noValue: CountCopy;
  /** "Framework ceilings RON 100,000,000 not counted"; gets the formatted amount. */
  frameworkCeilings: (formattedAmount: string) => string;
  /** The ⓘ link's accessible name, e.g. "How this total is counted". */
  methodology: string;
}

/** The labels of the inset figures (the value is the count or the amount): fixed text, so a count of one reads the same as many. */
export interface InsetFigureLabels {
  records: string;
  suspect: string;
  noValue: string;
  ceilings: string;
}

/** The copy of a Total that can take the inset layout. */
export type InsetTotalCopy = TotalFigureCopy & { figures: InsetFigureLabels };
