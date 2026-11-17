import { Button, LoadingStatus, Panel, RecordDetail, RecordSkeleton, SignalCard, StateNote, type Locale } from "@grivei/ui";
import { PageShell } from "../../components/PageShell/index.ts";
import { NotFoundPage } from "../NotFoundPage/index.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { useSignalLinks } from "../../signals/useSignalLinks.ts";
import { navigate } from "../../routing/location.tsx";
import { currentUrl } from "../../routing/currentUrl.ts";
import { pathFor } from "../../routing/routes.ts";
import { methodologyHref } from "../../methodology/methodologyLinks.ts";
import { subsequentRecordsHref } from "./recordPage.utils.ts";
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
      <RecordSkeleton
        copy={{ value: { heading: t.recordPage.value.heading, published: t.recordPage.value.published, counted: t.recordPage.value.counted }, winners: t.recordPage.parties.winners, facts: t.recordPage.heading.panel }}
        status={<LoadingStatus label={t.status.loading} />}
      />
    );
  }
  if (state.status === "error") {
    // the Record is one query: a failure is one note, with its retry, in a panel in the page body
    return (
      <PageShell>
        <Panel heading={t.recordPage.heading.panel} level="h2">
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
        </Panel>
      </PageShell>
    );
  }
  if (state.record === null) {
    return (
      <NotFoundPage locale={locale} title={t.recordPage.notFound.title} body={t.recordPage.notFound.body(code)} />
    );
  }
  return (
    <RecordDetail
      key={state.record.code}
      record={state.record}
      busy={state.stale}
      status={state.stale ? <LoadingStatus label={t.status.loading} /> : undefined}
      subsequentMoreHref={subsequentRecordsHref(locale, state.record)}
      citeUrl={currentUrl()}
      entityHref={(entity, role) => pathFor(locale, { name: "entity", entity: role, key: entity.key, view: "overview" })}
      authorityHref={(key) => pathFor(locale, { name: "entity", entity: "authority", key, view: "overview" })}
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
