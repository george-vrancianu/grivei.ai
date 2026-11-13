import type { RecordFilter } from "@grivei/contract";
import { EntityHeader, EntityOverview, EntityPageLayout, formatCount, OptionToggle, RecordsTab, RelationshipsTab, SignalCard, SignalList, SignalOrderToggle, StateNote, Typography, type EntityPageView as TabView, type Locale } from "@grivei/ui";
import { PageShell } from "../../components/PageShell/index.ts";
import { AppLink } from "../../components/AppLink/index.ts";
import { flowLensCopy, LoadedFlowLensSection } from "../../components/FlowLensSection/index.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { useSignalLinks } from "../../signals/useSignalLinks.ts";
import { navigate } from "../../routing/location.tsx";
import { useScrollToHash } from "../../routing/useScrollToHash.ts";
import { pathFor, type EntityRoute, type EntityView } from "../../routing/routes.ts";
import { decodeUrlState, encodeUrlState } from "../../urlState/codec.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { roleHref, roleOf, tabHref, tabHrefs } from "./entityPage.utils.ts";
import { SIGNALS_PAGE_SIZE, useEntityPage } from "./hooks/useEntityPage.ts";
import { useOverviewTab } from "./hooks/useOverviewTab.ts";
import { usePickedCounterparty } from "./hooks/usePickedCounterparty.ts";
import { useRecordsTab } from "./hooks/useRecordsTab.tsx";
import { useRelationshipsTab } from "./hooks/useRelationshipsTab.ts";

const LENSES = ["graph", "flow"] as const;

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
  const { filter, page, order, signalOrder, lens, counterparty, carried, update } = useUrlState();
  const role = roleOf(routeRole);
  const state = useEntityPage({ key: entityKey, role, view, filter, page, order, signalOrder });
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
  // Plain clicks on the tab and role links change page without a load; the links keep their real hrefs.
  const onNavigate = (href: string) => navigate(href, "push");
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
      tabCounts={tabCounts(state, filter, locale)}
      citeUrl={citeUrl()}
      onNavigate={onNavigate}
      copy={t.entityPage.layout}
    >
      {view === "records" ? (
        // The last Records stay on screen while the next filter loads, so the panel keeps its place and focus.
        state.records ? (
          <div aria-busy={loading}>
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
          <div aria-busy={loading}>
          <EntityOverview overview={state.overview} aliases={entity.aliases}
            signalsToolbar={
              <SignalOrderToggle
                value={signalOrder ?? "DATE_DESC"}
                // by date is the default, so it is left out of the URL; a different order starts again at page 1
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
                  pageHref: (n) => tabHref(locale, routeRole, entityKey, "overview", { filter, ...(signalOrder ? { signalOrder } : {}), page: n }),
                  onNavigate: (href) => navigate(href, "replace"),
                  copy: t.entityPage.signalPages,
                }}
              />
            } {...overviewTab} />
          </div>
        ) : loading ? (
          <StateNote kind="loading">{t.status.loading}</StateNote>
        ) : (
          // ready, but the entity has nothing in this role
          <StateNote kind="empty">{t.entityPage.recordsNoRole[role === "AUTHORITY" ? "authority" : "supplier"]}</StateNote>
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

/** The Records count beside the tab: the entity's own, so only when no filter narrows it and the open tab has loaded it (the Relationships tab has none). */
function tabCounts(state: ReturnType<typeof useEntityPage>, filter: RecordFilter, locale: Locale): Partial<Record<TabView, string>> {
  if (state.status !== "ready" || Object.values(filter).some((v) => v !== undefined)) return {};
  const total = state.overview?.total ?? state.records?.total;
  return total ? { records: formatCount(total.records, total.estimated, locale) } : {};
}

/** The address of this view as a reader would cite it: host, path and query, without the scheme. The carried search is navigation, not part of the citation, so it is left out. */
function citeUrl(): string {
  const state = decodeUrlState(window.location.search);
  return `${window.location.host}${window.location.pathname}${encodeUrlState({ ...state, carried: undefined })}`;
}
