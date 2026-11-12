import { Stack, Typography } from "@grivei/ui";
import { useCopy } from "../../copy/useCopy.ts";
import { SearchField } from "../../components/SearchField/index.ts";
import { useUrlState } from "../../urlState/useUrlState.ts";

/** `/explore/search`: placeholder until the search page (#44, #46) lands; the search box already lives in the URL. */
export function SearchPage() {
  const t = useCopy();
  const { filter, setFilter } = useUrlState();
  return (
    <Stack component="main" spacing={2} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" component="h1">
        {t.pages.search.title}
      </Typography>
      <SearchField copy={t.searchField} value={filter.q ?? ""} onChange={(q) => setFilter({ q })} />
      <Typography>{t.pages.placeholder}</Typography>
    </Stack>
  );
}
