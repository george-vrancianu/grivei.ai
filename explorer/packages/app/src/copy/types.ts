import type {
  BadgeCopy, CoverageLensMapCopy, DataThroughDateCopy, EntityHeaderCopy, EntityOverviewCopy, OnrcSectionCopy, EntityLinkCopy, EntityPageLayoutCopy, FilterChipsCopy, FullResultsCopy, PageNavCopy, CoveragePageLayoutCopy, MainScreenLayoutCopy, MethodologyPageCopy, MoneyLensMapCopy, PartyNameCopy, RecordDetailCopy, RecordsTabCopy, FlowLensMapCopy, RelationshipsTabCopy, ResultTabsCopy, SearchBarCopy, SourceEyebrowCopy, SignalCardCopy, SignalOrderToggleCopy, TotalFigureCopy,
} from "@grivei/ui";
import type { ZoomedCountySectionCopy } from "../components/ZoomedCountySection/index.ts";

/**
 * The shape of the bilingual copy catalogue: every user-facing string of the app is a key here, and `en.ts` and `ro.ts`
 * are both typed `Copy`, so a key missing from either language does not compile (and `copy.test.ts` checks it at run time).
 * Add a key by adding it here, then in both files. Prose that varies with a number is a function (`(n, formatted) => string`),
 * so each language owns its plural rules. Source data (titles, institution names) is never copied here.
 */
/** The "only Records matching ..." link (#106). */
export interface OnlyMatchingCopy {
  query: (q: string) => string;
  filters: string;
}

export interface Copy {
  brand: string;
  nav: { label: string; explore: string; search: string; coverage: string; methodology: string };
  /** The footer on every page: where the data comes from, and the counting principle. */
  footer: { provenance: string; signals: string };
  language: {
    /** The accessible name of the EN/RO group. */
    groupLabel: string;
    /** The current language's code (EN, RO), shown as the marked segment. */
    current: string;
    /** The other language's code, shown as the link text. */
    switchTo: string;
    /** The link's accessible name. */
    switchLabel: string;
  };
  status: { loading: string; failed: string };
  main: { title: string; total: string; /** Shown in the map's place when the county outlines cannot be loaded. */ mapUnavailable: string };
  /** The Source eyebrow above the search bar: the words around the Source's name, which comes from the API. */
  sourceEyebrow: SourceEyebrowCopy;
  /** The search bar on the main screen and the full-results view. */
  searchBar: SearchBarCopy;
  /** The result tabs of the main screen (and later of the full-results view): tab names, rows, empty states, Go-to card. */
  results: ResultTabsCopy;
  /** The full-results view at `/explore/search`: the tab names, empty sentences and rows come from `results` (same copy as the tabs), the rest is here. */
  fullResults: Omit<FullResultsCopy, "heading" | "empty" | "emptyLink" | "entityRow" | "recordRow">;
  /** The filter chips bar under the search field. */
  filterChips: FilterChipsCopy;
  /** The main screen template: lens toggle and region names. */
  mainScreenLayout: MainScreenLayoutCopy;
  /** The Money lens map on the main screen: legend, side toggle, off-map tiles. */
  moneyLensMap: MoneyLensMapCopy;
  /** The Coverage lens map (#51), wired by #90: status words, the N of M sentence, the Source marks; its off-map tiles carry the same wording as the Money lens's (kept as separate keys so the two can diverge). */
  coverageLensMap: CoverageLensMapCopy;
  /** The Money lens zoomed into a county (UAT choropleth): the map's strings, the way back, the heading, the chosen UAT. */
  zoomedCounty: ZoomedCountySectionCopy;
  /** The titles of the pages that carry no data of their own (the page not found, the search page); the others have their own keys. */
  pages: {
    notFound: { title: string; back: string };
    search: { title: string };
  };
  /** Badge labels and explanations (they double as filter chips). */
  badges: BadgeCopy;
  entityLink: EntityLinkCopy;
  party: PartyNameCopy;
  dataThrough: DataThroughDateCopy;
  total: TotalFigureCopy;
  /** The Record page: every string of the Record display. The badge, party and row copy come from the catalogue's own `badges`, `party` and `results`. */
  recordPage: Omit<RecordDetailCopy, "recordRow"> & { notFound: { title: string; body: (code: string) => string } };
  /** The Entity pages: the layout's tab names, the header and each tab's strings. */
  entityPage: {
    layout: EntityPageLayoutCopy;
    header: EntityHeaderCopy;
    /** The ONRC section of the Overview. */
    onrc: OnrcSectionCopy;
    notFound: { title: string; body: string };
    /**
     * The Relationships tab: the graph, timeline and side panel's strings (the entity-link, Record row and page-link copy come from the catalogue's own `entityLink`, `results` and `fullResults`),
     * the Graph / Flow toggle, and the Flow lens map's (its base map and off-map tiles come from `moneyLensMap`, which they share).
     */
    relationships: {
      lens: { label: string; options: { graph: string; flow: string } };
      tab: Omit<RelationshipsTabCopy, "entityLink" | "recordRow" | "pagination">;
      flow: Omit<FlowLensMapCopy, "map" | "tiles"> & { map: Pick<FlowLensMapCopy["map"], "mapLabel" | "legendTitle" | "noData"> };
    };
    /** The Overview tab: every section's strings. The total, party, Record row and badge copy come from the catalogue's own `total`, `party`, `results` and `badges`. */
    overview: {
      headline: Omit<EntityOverviewCopy["headline"], "totalFigure">;
      signals: EntityOverviewCopy["signals"];
      counterparties: Omit<EntityOverviewCopy["counterparties"], "party">;
      procedures: EntityOverviewCopy["procedures"];
      consortia: Omit<EntityOverviewCopy["consortia"], "party">;
      frameworks: EntityOverviewCopy["frameworks"];
      largest: Omit<EntityOverviewCopy["largest"], "recordRow">;
      aliases: Omit<EntityOverviewCopy["aliases"], "badges">;
    };
    /** The Records tab when the entity has no Records in the page's role (a stale or typed URL). */
    recordsNoRole: { authority: string; supplier: string };
    /** The page links under the Overview's Signals when they run over one page. */
    signalPages: PageNavCopy;
    /** The toggle above the Overview's Signals: by date or by RON. */
    signalOrder: SignalOrderToggleCopy;
    /** The Records tab: the heading, the facet panel's strings and the empty result. The badge, channel, row, total and page-link copy come from the catalogue's own `badges`, `filterChips`, `results`, `total` and `fullResults`. */
    recordsTab: Omit<RecordsTabCopy, "total" | "recordRow" | "pagination" | "facets"> & {
      facets: Omit<RecordsTabCopy["facets"], "badges" | "channels">;
      /** The link offered when the entity was opened from a search (#106): with a query it names it, with chips only it says "the search's filters". */
      onlyMatching: OnlyMatchingCopy;
    };
  };
  /** The Signal card and its compact form: the wording of every rule (label, sentence, lawful explanations), the links and the date. Neutral by test: no accusation, in either language. */
  signalCard: SignalCardCopy;
  /** The Coverage page (`/explore/coverage`): every section, the grid's words and the compact grid's link text. */
  coverage: CoveragePageLayoutCopy;
  /** The methodology page ("About the numbers"). */
  methodology: MethodologyPageCopy;
}
