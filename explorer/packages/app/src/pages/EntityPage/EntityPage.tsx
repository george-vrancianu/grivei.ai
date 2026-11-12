import { EntityHeader, EntityPageLayout, Stack, Typography, type Locale } from "@grivei/ui";
import { AppLink } from "../../components/AppLink/index.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { navigate } from "../../routing/location.tsx";
import { pathFor, type EntityRoute, type EntityView } from "../../routing/routes.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { roleHref, roleOf, tabHrefs } from "./entityPage.utils.ts";
import { useEntityPage } from "./hooks/useEntityPage.ts";

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

  if (state.status === "loading") {
    return (
      <Stack component="main" sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
        <Typography role="status">{t.status.loading}</Typography>
      </Stack>
    );
  }
  if (state.status === "error") {
    return (
      <Stack component="main" sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
        <Typography role="alert">{t.status.failed}</Typography>
      </Stack>
    );
  }
  if (state.entity === null) {
    return (
      <Stack component="main" spacing={2} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
        <Typography variant="h4" component="h1">
          {t.entityPage.notFound.title}
        </Typography>
        <Typography>{t.entityPage.notFound.body}</Typography>
        <AppLink href={pathFor(locale, { name: "main" })}>{t.pages.notFound.back}</AppLink>
      </Stack>
    );
  }
  // Plain clicks on the tab and role links change page without a load; the links keep their real hrefs.
  const onNavigate = (href: string) => navigate(href, "push");
  return (
    <EntityPageLayout
      header={
        <EntityHeader
          entity={state.entity}
          role={role}
          roleHref={(r) => roleHref(locale, state.entity?.key ?? entityKey, view, r)}
          onNavigate={onNavigate}
          locale={locale}
          copy={t.entityPage.header}
        />
      }
      view={view}
      tabHrefs={tabHrefs(locale, routeRole, entityKey, filter)}
      onNavigate={onNavigate}
      copy={t.entityPage.layout}
    >
      <Typography>{t.entityPage.tabBody[view]}</Typography>
    </EntityPageLayout>
  );
}
