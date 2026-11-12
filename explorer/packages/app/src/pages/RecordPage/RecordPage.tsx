import type { ReactNode } from "react";
import { RecordDetail, Stack, Typography, type Locale } from "@grivei/ui";
import { AppLink } from "../../components/AppLink/index.ts";
import { useCopy } from "../../copy/useCopy.ts";
import { navigate } from "../../routing/location.tsx";
import { pathFor } from "../../routing/routes.ts";
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
    <PageShell>
      <RecordDetail
        record={state.record}
        entityHref={(entity, role) => pathFor(locale, { name: "entity", entity: role, key: entity.key, view: "overview" })}
        recordHref={(c) => pathFor(locale, { name: "record", code: c })}
        methodologyHref={pathFor(locale, { name: "methodology" })}
        // plain clicks on the page's own links change page without a load; the links keep their real hrefs
        onNavigate={(href) => navigate(href, "push")}
        locale={locale}
        copy={{ ...t.recordPage, recordRow: { ...t.results.recordRow } }}
      />
    </PageShell>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <Stack component="main" spacing={2} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      {children}
    </Stack>
  );
}
