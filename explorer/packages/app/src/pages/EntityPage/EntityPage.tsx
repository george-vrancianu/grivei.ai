import { EntityHeader, EntityOverview, Box, EntityPageLayout, FinancialStatementsSection, FirmDonationsSection, OnrcFilterChips, OnrcResults, OnrcSection, PeopleSection, LeadershipSection, OptionToggle, PublicEnterpriseSection, RecordsTab, RelationshipsTab, SignalCard, SignalList, SignalOrderToggle, SourcePicker, Stack, StateNote, Typography, type Locale } from "@grivei/ui";
import type { OnrcFilter } from "@grivei/contract";
import { PageShell } from "../../components/PageShell/index.ts";
import { AppLink } from "../../components/AppLink/index.ts";
import { flowLensCopy, LoadedFlowLensSection } from "../../components/FlowLensSection/index.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { useSignalLinks } from "../../signals/useSignalLinks.ts";
import { currentUrl } from "../../routing/currentUrl.ts";
import { navigate } from "../../routing/location.tsx";
import { useScrollToHash } from "../../routing/useScrollToHash.ts";
import { pathFor, type EntityRoute, type EntityView } from "../../routing/routes.ts";
import { asSource } from "../../sources/sourceCounts.ts";
import { ONRC_PAGE_SIZE } from "../../sources/useSourceCounts.ts";
import { encodeOnrcScreen, patchToOnrc, useOnrcUrlState } from "../../urlState/onrcScreen.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { roleHref, roleOf, tabHref, tabHrefs } from "./entityPage.utils.ts";
import { SIGNALS_PAGE_SIZE, useEntityPage } from "./hooks/useEntityPage.ts";
import { useEntityOnrc } from "./hooks/useEntityOnrc.ts";
import { useOverviewTab } from "./hooks/useOverviewTab.ts";
import { usePickedCounterparty } from "./hooks/usePickedCounterparty.ts";
import { useTabCounts } from "./hooks/useTabCounts.ts";
import { useRecordsTab } from "./hooks/useRecordsTab.tsx";
import { useRelationshipsTab } from "./hooks/useRelationshipsTab.ts";

const LENSES = ["graph", "flow"] as const;
const NO_FILTER = {} as const;

export interface EntityPageProps {
  locale: Locale;
  /** From the route: /authority/ or /supplier/, the entity's key and the open tab. */
  entity: EntityRoute;
  entityKey: string;
  view: EntityView;
}

/** `/explore/<authority|supplier>/<key>[/records|/relationships]`: the entity's header and the open tab. Each tab runs its own operation. */
export function EntityPage({ locale, entity: routeRole, entityKey, view }: EntityPageProps) {
  const t = useCopy();
  const signals = useSignalLinks(locale);
  const { filter: urlFilter, page, order, signalOrder, lens, counterparty, carried, source, update } = useUrlState();
  // On the Records tab's ONRC side (`source=onrc`) the URL's filter keys are ONRC's chips, not SEAP's: the entity's SEAP data is asked unfiltered
  const onrcMode = source === "ONRC";
  const filter = onrcMode ? NO_FILTER : urlFilter;
  const role = roleOf(routeRole);
  const state = useEntityPage({ key: entityKey, role, view, filter, page, order, signalOrder });
  const onrcUrl = useOnrcUrlState();
  // The Records tab's Source switch (#178): ONRC's registrations of the entity, found by its CUI. The query text is not a chip here (the CUI is the search).
  const onrcChips: OnrcFilter = onrcMode ? Object.fromEntries(Object.entries(onrcUrl.filter).filter(([field]) => field !== "q")) : NO_FILTER;
  // ONRC's rows are asked for only when they would be shown: on the ONRC side, or when SEAP has no Records of the entity. Whether ONRC lists the CUI at all comes with the Records tab (`onrcListed`).
  const onrcListed = state.status !== "error" && state.onrcListed;
  const seapEmpty = state.status === "ready" && state.records === null;
  const registrations = useEntityOnrc(state.status !== "error" ? (state.entity?.cui ?? null) : null, onrcChips, view === "records" && onrcListed && (onrcMode || seapEmpty));
  const tabCounts = useTabCounts(`${role}:${entityKey}`, state, filter, locale);
  const recordsTab = useRecordsTab(locale, routeRole, entityKey);
  const overviewTab = useOverviewTab(locale, routeRole, entityKey);
  const relationshipsTab = useRelationshipsTab(locale, routeRole, entityKey);
  // The picked counterparty's months and Records load beside the tab's own data, so a pick never reloads the graph.
  const picked = usePickedCounterparty({ key: entityKey, role, filter, counterparty: view === "relationships" && state.status !== "error" && state.relationships ? (counterparty ?? null) : null, page: page ?? 1 });

  // a link to `#signals` (the "n Signals" chip of an entity row) lands on the Overview's Signals section once it has rendered
  useScrollToHash(view === "overview" && state.status === "ready" && state.overview !== null);

  if (state.status === "error") {
    return (
      <PageShell>
        <StateNote kind="error">{t.status.failed}</StateNote>
      </PageShell>
    );
  }
  if (state.status === "ready" && state.entity === null) {
    return (
      <PageShell>
        <Typography variant="h1" component="h1">
          {t.entityPage.notFound.title}
        </Typography>
        <StateNote kind="empty" action={<AppLink href={pathFor(locale, { name: "main" })}>{t.pages.notFound.back}</AppLink>}>
          {t.entityPage.notFound.body}
        </StateNote>
      </PageShell>
    );
  }
  const loading = state.status === "loading";
  const flowCopy = flowLensCopy(t);
  const entity = state.entity;
  // The ONRC section: the same on both role pages of an entity that is an authority and a supplier; an entity with no SEAP role at all exists in ONRC only
  const onrcSection = state.onrc && entity && <OnrcSection registration={state.onrc} onrcOnly={entity.seap.roles.length === 0} locale={locale} copy={t.entityPage.onrc} />;
  // ONRC's administrators and legal representatives (#177), public tier: the API sends them only for a SEAP counterparty. A holder links to a person page only when the API sent a person
  // (the host's Restricted switch is `show`), so this page never builds a link the host would not serve.
  const peopleSection = state.people && <PeopleSection people={state.people} personHref={(id) => pathFor(locale, { name: "person", id })} onNavigate={(href) => navigate(href, "push")} locale={locale} copy={t.entityPage.people} />;
  // "Public enterprise (AMEPIP)" with its basis, on the Overview of an entity whose CUI appears in AMEPIP's tables (the same on both role pages)
  const publicEnterpriseSection = state.publicEnterprise && entity?.cui && <PublicEnterpriseSection enterprise={state.publicEnterprise} cui={entity.cui} locale={locale} copy={t.entityPage.publicEnterprise} />;
  // The Leadership list (#180): a town hall, sector, Bucharest city hall, county council, or a subordinate body shown through its authority; the authority role page only, never the supplier role page of the same entity
  const leadershipSection = state.leadership && role === "AUTHORITY" && (
    <LeadershipSection leadership={state.leadership} authorityHref={(key) => pathFor(locale, { name: "entity", entity: "authority", key, view: "overview" })} onNavigate={(href) => navigate(href, "push")} locale={locale} copy={t.entityPage.leadership} />
  );
  // MF's annual statements with the awards of each year beside them (#179): a supplier's page; an entity with no SEAP role (ONRC only) opens as a supplier too
  const financialsSection = state.financials && role === "SUPPLIER" && <FinancialStatementsSection financials={state.financials} locale={locale} copy={t.entityPage.financials} />;
  // BaniPartide's firm donations and loans (#182) on any role page of the entity; on a supplier's page they open with "also a firm donor" as context (never a Signal)
  const donationsSection = state.donations && <FirmDonationsSection donations={state.donations} supplier={role === "SUPPLIER" && !!entity?.seap.roles.includes("SUPPLIER")} locale={locale} copy={t.entityPage.donations} />;
  // Plain clicks on the tab and role links change page without a load; the links keep their real hrefs.
  const onNavigate = (href: string) => navigate(href, "push");
  // The Records tab has a Source switch when both Sources have something for the entity; a Source with nothing is not offered and shows nothing.
  const switches = t.sources.recordsSwitch;
  const seapHasRecords = state.records !== null;
  const onrcHasRegistrations = registrations.status === "ready" && registrations.all.length > 0;
  // "SEAP has nothing" is decided once SEAP has settled: while its Records load (coming from another tab, say), the plain URL must not flash ONRC's registrations
  const showOnrcRecords = onrcHasRegistrations && (onrcMode || seapEmpty);
  // the ONRC side waits for the Records tab's answer on whether ONRC lists the CUI, then for the rows
  const onrcPending = onrcMode && ((state.status === "loading" && !onrcListed) || registrations.status === "loading");
  // `entity.onrc` does not say the registration is one ONRC's search lists: once the rows are in and there are none, ONRC has nothing to offer and the switch goes
  const onrcEmpty = registrations.status === "ready" && registrations.all.length === 0;
  const sourceSwitch = seapHasRecords && onrcListed && !onrcEmpty && (
    <SourcePicker
      options={[{ id: "SEAP", label: switches.options.SEAP }, { id: "ONRC", label: switches.options.ONRC }]}
      selected={showOnrcRecords ? "ONRC" : "SEAP"}
      // each Source has its own filter in the URL: a switch starts the other one unfiltered
      onSelect={(id) => navigate(asSource(id) === "ONRC" ? `${pathFor(locale, { name: "entity", entity: routeRole, key: entityKey, view: "records" })}${encodeOnrcScreen({ filter: {} })}` : tabHref(locale, routeRole, entityKey, "records", { filter: {}, ...(carried ? { carried } : {}) }), "push")}
      copy={switches}
    />
  );
  return (
    <EntityPageLayout
      header={
        entity && (
          <EntityHeader
            entity={entity}
            role={role}
            roleHref={(r) => roleHref(locale, entity.key, view, r)}
            onNavigate={onNavigate}
            locale={locale}
            copy={t.entityPage.header}
          />
        )
      }
      view={view}
      tabHrefs={tabHrefs(locale, routeRole, entity?.key ?? entityKey, filter, carried)}
      tabCounts={tabCounts}
      citeUrl={currentUrl()}
      onNavigate={onNavigate}
      copy={t.entityPage.layout}
    >
      {view === "records" ? (
        showOnrcRecords && registrations.status === "ready" ? (
          <Stack spacing={2}>
            {sourceSwitch}
            <OnrcResults
              count={registrations.rows.length}
              rows={registrations.rows}
              page={1}
              pageSize={ONRC_PAGE_SIZE}
              pageHref={() => ""}
              toolbar={<OnrcFilterChips filter={onrcChips} onChange={(next) => onrcUrl.setFilter(patchToOnrc(onrcUrl.filter, next))} locale={locale} copy={t.sources.onrc.filterChips} />}
              locale={locale}
              copy={{ ...t.sources.onrc.results, empty: t.sources.onrc.registrations.noMatch }}
            />
          </Stack>
        ) : onrcPending ? (
          <StateNote kind="loading">{t.status.loading}</StateNote>
        ) : state.records ? (
          // The last Records stay on screen while the next filter loads, so the panel keeps its place and focus.
          <div aria-busy={loading}>
            {sourceSwitch && <Box sx={{ mb: 2 }}>{sourceSwitch}</Box>}
            <RecordsTab records={state.records} signalBadges={signals.badges} {...recordsTab} />
          </div>
        ) : loading ? (
          <StateNote kind="loading">{t.status.loading}</StateNote>
        ) : (
          // ready, but the entity has no Records in this role
          <StateNote kind="empty">{t.entityPage.recordsNoRole[role === "AUTHORITY" ? "authority" : "supplier"]}</StateNote>
        )
      ) : view === "overview" ? (
        state.overview && entity ? (
          // The last Overview of this entity and filter stays on screen while a new Signals order or page loads (the toggle keeps its focus).
          <Stack spacing={3} aria-busy={loading}>
            <EntityOverview overview={state.overview} aliases={entity.aliases}
              signalsToolbar={
                <SignalOrderToggle
                  value={signalOrder ?? "DATE_DESC"}
                  // by date is the default, so it is left out of the URL; a different order starts again at page 1 (from Signals page 2 the window scrolls to the top, as the page links do)
                  onChange={(next) => update({ signalOrder: next === "DATE_DESC" ? undefined : next, page: undefined })}
                  copy={t.entityPage.signalOrder}
                />
              }
              signals={
                <SignalList
                  signals={state.overview.signals.rows}
                  locale={locale}
                  renderItem={(signal) => <SignalCard signal={signal} {...signals.cardProps(signal, signal.records)} />}
                  pagination={{
                    page: page ?? 1,
                    pages: Math.ceil(state.overview.signals.count / SIGNALS_PAGE_SIZE),
                    // the Overview's page links: the same view on another slice of the Signals, so the history entry is replaced
                    pageHref: (n) => tabHref(locale, routeRole, entityKey, "overview", { filter, ...(signalOrder ? { signalOrder } : {}), ...(carried ? { carried } : {}), page: n }),
                    onNavigate: (href) => navigate(href, "replace"),
                    copy: t.entityPage.signalPages,
                  }}
                />
              } {...overviewTab} />
            {/* the Reference sources' panels come after the SEAP Overview (headline numbers and Signals), so a large entity's page does not open on up to six panels of other sources */}
            {onrcSection}
            {peopleSection}
            {publicEnterpriseSection}
            {leadershipSection}
            {financialsSection}
            {donationsSection}
          </Stack>
        ) : loading ? (
          <StateNote kind="loading">{t.status.loading}</StateNote>
        ) : (
          // ready, but the entity has nothing in this role: its ONRC section (an organisation that exists only in ONRC) still shows
          <Stack spacing={3}>
            {onrcSection}
            {financialsSection}
            {donationsSection}
            <StateNote kind="empty">{t.entityPage.recordsNoRole[role === "AUTHORITY" ? "authority" : "supplier"]}</StateNote>
          </Stack>
        )
      ) : loading ? (
        <StateNote kind="loading">{t.status.loading}</StateNote>
      ) : state.relationships && entity ? (
        <>
          {picked.status === "error" && <StateNote kind="error">{t.status.failed}</StateNote>}
          <RelationshipsTab
            entity={entity}
            counterparties={state.relationships.counterparties}
            timeline={state.relationships.timeline}
            selectedTimeline={picked.status === "ready" ? picked.timeline : null}
            sidePanel={picked.status === "ready" ? picked.panel : null}
            sidePanelLoading={picked.status === "loading"}
            flowToggle={
              <OptionToggle
                options={LENSES}
                value={lens === "flow" ? "flow" : "graph"}
                onChange={(next) => update({ lens: next === "flow" ? "flow" : undefined })}
                labels={t.entityPage.relationships.lens.options}
                label={t.entityPage.relationships.lens.label}
              />
            }
            flowMap={
              lens === "flow" ? (
                <LoadedFlowLensSection
                  flow={state.relationships.flow}
                  role={routeRole}
                  home={entity.placement?.county?.code ?? null}
                  locale={locale}
                  copy={flowCopy}
                  status={{ unavailable: t.main.mapUnavailable, loading: t.status.loading }}
                />
              ) : undefined
            }
            {...relationshipsTab}
          />
        </>
      ) : (
        // ready, but the entity has nothing in this role
        <StateNote kind="empty">{t.entityPage.recordsNoRole[role === "AUTHORITY" ? "authority" : "supplier"]}</StateNote>
      )}
    </EntityPageLayout>
  );
}
