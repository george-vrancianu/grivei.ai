/** Every string of ONRC's filter chips. The statuses' names on the results are ONRC's own words (source data); these are the chips' labels. */
export interface OnrcFilterChipsCopy {
  /** The accessible name of the whole bar. */
  label: string;
  status: {
    group: string;
    /** The label of each offered status code, by code. */
    options: Record<number, string>;
    /** A status code the chips do not name (it came in through the URL). */
    other: (code: number) => string;
  };
  seapCounterparty: { group: string; yes: string; no: string };
  caen: { label: string; hint: string };
  registered: { group: string; from: string; to: string };
  active: {
    group: string;
    none: string;
    caen: (code: string) => string;
    county: (area: string) => string;
    /** The Unplaced tile's chip. */
    unplaced: string;
    from: (date: string) => string;
    to: (date: string) => string;
    seapCounterparty: { yes: string; no: string };
    /** The accessible name of an active chip's remove action. */
    remove: (chip: string) => string;
    clearAll: string;
  };
}
