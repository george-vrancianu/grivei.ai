import { Stack, Typography, type Locale } from "@grivei/ui";
import { copy } from "../../copy.ts";
import { RecordsList } from "../../components/RecordsList/index.ts";
import { TotalSummary } from "../../components/TotalSummary/index.ts";
import { useMainScreen } from "./hooks/useMainScreen.ts";

/** `/explore/` and `/ro/explore/`: the Total and the Records for the current filter (the tracer: the empty one). */
export function MainScreenPage({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const state = useMainScreen();
  return (
    <Stack component="main" spacing={3} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" component="h1">
        {t.title}
      </Typography>
      {state.status === "loading" && <Typography role="status">{t.loading}</Typography>}
      {state.status === "error" && <Typography role="alert">{t.failed}</Typography>}
      {state.status === "ready" && (
        <>
          <TotalSummary total={state.data.seap.search.total} copy={t} locale={locale} />
          <RecordsList page={state.data.seap.search.records} copy={t} locale={locale} />
        </>
      )}
    </Stack>
  );
}
