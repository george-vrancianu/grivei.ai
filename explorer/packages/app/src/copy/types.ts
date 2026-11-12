import type {
  BadgeCopy, DataThroughDateCopy, EntityHeaderCopy, EntityOverviewCopy, EntityLinkCopy, EntityPageLayoutCopy, FilterChipsCopy, FullResultsCopy, PageNavCopy, CoveragePageLayoutCopy, MainScreenLayoutCopy, MethodologyPageCopy, MoneyLensMapCopy, PartyNameCopy, RecordDetailCopy, RecordsTabCopy, FlowLensMapCopy, RelationshipsTabCopy, ResultTabsCopy, SearchBarCopy, SignalCardCopy, TotalFigureCopy,
} from "@grivei/ui";
import type { ZoomedCountySectionCopy } from "../components/ZoomedCountySection/index.ts";

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
  main: { title: string; total: string; /** Shown in the map's place when the county outlines cannot be loaded. */ mapUnavailable: string };
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
  /** The Money lens map on the main screen: legend, side toggle, off-map tiles. */
  moneyLensMap: MoneyLensMapCopy;
  /** The Money lens zoomed into a county (UAT choropleth): the map's strings, the way back, the heading, the chosen UAT. */
  zoomedCounty: ZoomedCountySectionCopy;
  /** Placeholder pages: what each route will hold. Replaced one by one by the tickets that build the page. */
  pages: {
    placeholder: string;
    notFound: { title: string; back: string };
    search: { title: string };
    record: { title: string };
    methodology: { title: string };
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
    /** The Records tab: the heading, the facet panel's strings and the empty result. The badge, channel, row, total and page-link copy come from the catalogue's own `badges`, `filterChips`, `results`, `total` and `fullResults`. */
    recordsTab: Omit<RecordsTabCopy, "total" | "recordRow" | "pagination" | "facets"> & { facets: Omit<RecordsTabCopy["facets"], "badges" | "channels"> };
  };
  /** The Signal card and its compact form: the wording of every rule (label, sentence, lawful explanations), the links and the date. Neutral by test: no accusation, in either language. */
  signalCard: SignalCardCopy;
  /** The Coverage page (`/explore/coverage`): every section, the grid's words and the compact grid's link text. */
  coverage: CoveragePageLayoutCopy;
  /** The methodology page ("About the numbers"). */
  methodology: MethodologyPageCopy;
}
