import { RecordDetail, SignalCard, Typography, type Locale } from "@grivei/ui";
import { AppLink } from "../../components/AppLink/index.ts";
import { PageShell } from "../../components/PageShell/index.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { useSignalLinks } from "../../signals/useSignalLinks.ts";
import { navigate } from "../../routing/location.tsx";
import { currentUrl } from "../../routing/currentUrl.ts";
import { pathFor } from "../../routing/routes.ts";
import { methodologyHref } from "../../methodology/methodologyLinks.ts";
import { useRecordPage } from "./hooks/useRecordPage.ts";

export interface RecordPageProps {
  locale: Locale;
  /** From the route: the Record's code as published. */
  code: string;
}

/** `/explore/record/<code>`: one Record in full, or a message when it is loading, could not be loaded or does not exist. */
export function RecordPage({ locale, code }: RecordPageProps) {
  const t = useCopy();
  const state = useRecordPage(code);
  const signals = useSignalLinks(locale);

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
  if (state.record === null) {
    return (
      <PageShell>
        <Typography variant="h4" component="h1">
          {t.recordPage.notFound.title}
        </Typography>
        <Typography>{t.recordPage.notFound.body(code)}</Typography>
        <AppLink href={pathFor(locale, { name: "main" })}>{t.pages.notFound.back}</AppLink>
      </PageShell>
    );
  }
  return (
    <RecordDetail
      record={state.record}
      citeUrl={currentUrl()}
      entityHref={(entity, role) => pathFor(locale, { name: "entity", entity: role, key: entity.key, view: "overview" })}
      recordHref={(c) => pathFor(locale, { name: "record", code: c })}
      methodologyHref={methodologyHref(locale, "suspectValues")}
      // plain clicks on the page's own links change page without a load; the links keep their real hrefs
      onNavigate={(href) => navigate(href, "push")}
      // the Signal's own Records have no provenance in this query: a Signal of one Record is this Record
      renderSignalCard={(signal) => <SignalCard signal={signal} {...signals.cardProps(signal, signal.recordCount === 1 && state.record ? [{ code: state.record.code, provenance: state.record.provenance }] : signal.records)} />}
      locale={locale}
      copy={{ ...t.recordPage, recordRow: t.results.recordRow }}
    />
  );
}
