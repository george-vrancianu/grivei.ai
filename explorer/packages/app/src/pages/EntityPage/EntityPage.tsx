import type { ReactNode } from "react";
import { EntityHeader, EntityPageLayout, RecordsTab, Stack, Typography, type Locale } from "@grivei/ui";
import { AppLink } from "../../components/AppLink/index.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { navigate } from "../../routing/location.tsx";
import { pathFor, type EntityRoute, type EntityView } from "../../routing/routes.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { roleHref, roleOf, tabHrefs } from "./entityPage.utils.ts";
import { useEntityPage } from "./hooks/useEntityPage.ts";
import { useRecordsTab } from "./hooks/useRecordsTab.ts";

export interface EntityPageProps {
  locale: Locale;
  /** From the route: /authority/ or /supplier/, the entity's key and the open tab. */
  entity: EntityRoute;
  entityKey: string;
  view: EntityView;
}

/** `/explore/<authority|supplier>/<key>[/records|/relationships]`: the entity's header and the open tab. The tab bodies are filled by their own tickets. */
export function EntityPage({ locale, entity: routeRole, entityKey, view }: EntityPageProps) {
  const t = useCopy();
  const { filter, page, order, signalOrder } = useUrlState();
  const role = roleOf(routeRole);
  const state = useEntityPage({ key: entityKey, role, view, filter, page, order, signalOrder });
  const recordsTab = useRecordsTab(locale, routeRole, entityKey);

  if (state.status === "error") {
    return (
      <PageShell>
        <Typography role="alert">{t.status.failed}</Typography>
      </PageShell>
    );
  }
  if (state.status === "ready" && state.entity === null) {
    return (
      <PageShell>
        <Typography variant="h4" component="h1">
          {t.entityPage.notFound.title}
        </Typography>
        <Typography>{t.entityPage.notFound.body}</Typography>
        <AppLink href={pathFor(locale, { name: "main" })}>{t.pages.notFound.back}</AppLink>
      </PageShell>
    );
  }
  const loading = state.status === "loading";
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
      tabHrefs={tabHrefs(locale, routeRole, entity?.key ?? entityKey, filter)}
      onNavigate={onNavigate}
      copy={t.entityPage.layout}
    >
      {view === "records" ? (
        // The last Records stay on screen while the next filter loads, so the panel keeps its place and focus.
        state.records ? (
          <div aria-busy={loading}>
            <RecordsTab records={state.records} {...recordsTab} />
          </div>
        ) : loading ? (
          <Typography role="status">{t.status.loading}</Typography>
        ) : (
          // ready, but the entity has no Records in this role
          <Typography>{t.entityPage.recordsNoRole[role === "AUTHORITY" ? "authority" : "supplier"]}</Typography>
        )
      ) : loading ? (
        <Typography role="status">{t.status.loading}</Typography>
      ) : (
        <Typography>{t.entityPage.tabBody[view]}</Typography>
      )}
    </EntityPageLayout>
  );
}

/** The bare page for the states with no entity to show: the data could not be loaded, or no entity has that key. */
function PageShell({ children }: { children: ReactNode }) {
  return (
    <Stack component="main" spacing={2} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      {children}
    </Stack>
  );
}
