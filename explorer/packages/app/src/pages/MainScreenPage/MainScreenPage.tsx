import { Stack, Typography, type Locale } from "@grivei/ui";
import { useCopy } from "../../copy/useCopy.ts";
import { RecordsList } from "../../components/RecordsList/index.ts";
import { SearchField } from "../../components/SearchField/index.ts";
import { TotalSummary } from "../../components/TotalSummary/index.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";
import { useMainScreen } from "./hooks/useMainScreen.ts";

/** `/explore/` and `/ro/explore/`: the Total and the Records for the filter in the URL. */
export function MainScreenPage({ locale }: { locale: Locale }) {
  const t = useCopy();
  const { filter, setFilter } = useUrlState();
  const state = useMainScreen({ filter });
  return (
    <Stack component="main" spacing={3} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" component="h1">
        {t.main.title}
      </Typography>
      <SearchField copy={t.searchField} value={filter.q ?? ""} onChange={(q) => setFilter({ q })} />
      {state.status === "loading" && <Typography role="status">{t.status.loading}</Typography>}
      {state.status === "error" && <Typography role="alert">{t.status.failed}</Typography>}
      {state.status === "ready" && (
        <>
          <TotalSummary total={state.data.seap.search.total} copy={{ total: t.main.total, records: t.records.countSuffix }} locale={locale} />
          <RecordsList page={state.data.seap.search.records} copy={t.records} locale={locale} />
        </>
      )}
    </Stack>
  );
}
