import { Button, LoadingStatus, PersonDetail, PersonDetailFailed, PersonDetailSkeleton, StateNote, type Locale } from "@grivei/ui";
import { NotFoundPage } from "../NotFoundPage/index.ts";
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
  const homeHref = pathFor(locale, { name: "main" });
  const onNavigate = (href: string) => navigate(href, "push");
  if (state.status === "loading") {
    return <PersonDetailSkeleton copy={t.personPage} homeHref={homeHref} onNavigate={onNavigate} status={<LoadingStatus label={t.status.loading} />} />;
  }
  if (state.status === "error") {
    // the person is one query: a failure is one note, with its retry, in the person panel
    return (
      <PersonDetailFailed copy={t.personPage} homeHref={homeHref} onNavigate={onNavigate}>
        <StateNote
          kind="error"
          action={
            <Button size="small" onClick={state.retry}>
              {t.status.retry}
            </Button>
          }
        >
          {t.status.failed}
        </StateNote>
      </PersonDetailFailed>
    );
  }
  if (state.person === null) {
    return (
      <NotFoundPage locale={locale} title={t.personPage.notFound.title} body={t.personPage.notFound.body} />
    );
  }
  return (
    <PersonDetail
      person={state.person}
      homeHref={homeHref}
      busy={state.stale}
      status={state.stale ? <LoadingStatus label={t.status.loading} /> : undefined}
      entityHref={(key, role) => pathFor(locale, { name: "entity", entity: role === "AUTHORITY" ? "authority" : "supplier", key, view: "overview" })}
      onNavigate={onNavigate}
      locale={locale}
      copy={t.personPage}
    />
  );
}
