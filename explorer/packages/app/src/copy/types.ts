import type { BadgeCopy, DataThroughDateCopy, EntityHeaderCopy, EntityLinkCopy, EntityPageLayoutCopy, PartyNameCopy, TotalFigureCopy } from "@grivei/ui";

/**
 * The shape of the bilingual copy catalogue: every user-facing string of the app is a key here, and `en.ts` and `ro.ts`
 * are both typed `Copy`, so a key missing from either language does not compile (and `copy.test.ts` checks it at run time).
 * Add a key by adding it here, then in both files. Prose that varies with a number is a function (`(n, formatted) => string`),
 * so each language owns its plural rules. Source data (titles, institution names) is never copied here.
 */
export interface Copy {
  brand: string;
  nav: { label: string; explore: string; search: string; coverage: string; methodology: string };
  language: {
    /** The other language's own name, shown as the link text. */
    switchTo: string;
    /** The link's accessible name. */
    switchLabel: string;
  };
  status: { loading: string; failed: string };
  main: { title: string; total: string };
  searchField: { label: string; placeholder: string };
  records: {
    heading: string;
    empty: string;
    noValue: string;
    columns: { code: string; title: string; authority: string; supplier: string; date: string; value: string };
  };
  /** Placeholder pages: what each route will hold. Replaced one by one by the tickets that build the page. */
  pages: {
    placeholder: string;
    notFound: { title: string; back: string };
    search: { title: string };
    record: { title: string };
    coverage: { title: string };
    methodology: { title: string };
  };
  /** Badge labels and explanations (they double as filter chips). */
  badges: BadgeCopy;
  entityLink: EntityLinkCopy;
  party: PartyNameCopy;
  dataThrough: DataThroughDateCopy;
  total: TotalFigureCopy;
  /** The Entity pages: the layout's tab names, the header, and what each tab's body says until its ticket fills it. */
  entityPage: {
    layout: EntityPageLayoutCopy;
    header: EntityHeaderCopy;
    notFound: { title: string; body: string };
    tabBody: { overview: string; records: string; relationships: string };
  };
}
