import type {
  BadgeCopy, DataThroughDateCopy, EntityHeaderCopy, EntityLinkCopy, EntityPageLayoutCopy, FilterChipsCopy, FullResultsCopy, MainScreenLayoutCopy, PartyNameCopy, RecordsTabCopy, ResultTabsCopy, SearchBarCopy, TotalFigureCopy,
} from "@grivei/ui";

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
  /** The search bar on the main screen and the full-results view. */
  searchBar: SearchBarCopy;
  /** The result tabs of the main screen (and later of the full-results view): tab names, rows, empty states, Go-to card. */
  results: ResultTabsCopy;
  /** The full-results view at `/explore/search`: the tab names, empty sentences and rows come from `results` (same copy as the tabs), the rest is here. */
  fullResults: Omit<FullResultsCopy, "heading" | "empty" | "entityRow" | "recordRow">;
  /** The filter chips bar under the search field. */
  filterChips: FilterChipsCopy;
  /** The main screen template: lens toggle and region names. */
  mainScreenLayout: MainScreenLayoutCopy;
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
    tabBody: { overview: string; relationships: string };
    /** The Records tab when the entity has no Records in the page's role (a stale or typed URL). */
    recordsNoRole: { authority: string; supplier: string };
    /** The Records tab: the heading, the facet panel's strings and the empty result. The badge, channel, row, total and page-link copy come from the catalogue's own `badges`, `filterChips`, `results`, `total` and `fullResults`. */
    recordsTab: Omit<RecordsTabCopy, "total" | "recordRow" | "pagination" | "facets"> & { facets: Omit<RecordsTabCopy["facets"], "badges" | "channels"> };
  };
}
