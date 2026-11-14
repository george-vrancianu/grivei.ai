import { PersonDetail, Typography, type Locale } from "@grivei/ui";
import { AppLink } from "../../components/AppLink/index.ts";
import { PageShell } from "../../components/PageShell/index.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { navigate } from "../../routing/location.tsx";
import { pathFor } from "../../routing/routes.ts";
import { usePersonPage } from "./hooks/usePersonPage.ts";

export interface PersonPageProps {
  locale: Locale;
  /** From the route: the person's id (a keyed hash). */
  id: string;
}

/**
 * `/explore/person/<id>` (Restricted, ADR 0015): a person and their roles across organisations. Only a Private view is served it: a host that hides Restricted content answers null,
 * and the page says the page is not available there, whether or not the id exists.
 */
export function PersonPage({ locale, id }: PersonPageProps) {
  const t = useCopy();
  const state = usePersonPage(id);
  if (state.status === "loading") {
    return (
      <PageShell>
        <Typography role="status">{t.status.loading}</Typography>
      </PageShell>
    );
  }
  if (state.status === "error") {
    return (
      <PageShell>
        <Typography role="alert">{t.status.failed}</Typography>
      </PageShell>
    );
  }
  if (state.person === null) {
    return (
      <PageShell>
        <Typography variant="h4" component="h1">
          {t.personPage.notFound.title}
        </Typography>
        <Typography>{t.personPage.notFound.body}</Typography>
        <AppLink href={pathFor(locale, { name: "main" })}>{t.pages.notFound.back}</AppLink>
      </PageShell>
    );
  }
  return (
    <PersonDetail
      person={state.person}
      entityHref={(key, role) => pathFor(locale, { name: "entity", entity: role === "AUTHORITY" ? "authority" : "supplier", key, view: "overview" })}
      onNavigate={(href) => navigate(href, "push")}
      locale={locale}
      copy={t.personPage}
    />
  );
}
