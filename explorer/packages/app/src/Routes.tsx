import { useCopy } from "./copy/useCopy.ts";
import { AppLink } from "./components/AppLink/index.ts";
import { CoveragePage } from "./pages/CoveragePage/index.ts";
import { EntityPage } from "./pages/EntityPage/index.ts";
import { MainScreenPage } from "./pages/MainScreenPage/index.ts";
import { NotFoundPage } from "./pages/NotFoundPage/index.ts";
import { MethodologyPage } from "./pages/MethodologyPage/index.ts";
import { OnrcPage } from "./pages/OnrcPage/index.ts";
import { PersonPage } from "./pages/PersonPage/index.ts";
import { RecordPage } from "./pages/RecordPage/index.ts";
import { SearchPage } from "./pages/SearchPage/index.ts";
import { useLocation } from "./routing/location.tsx";
import { pathFor } from "./routing/routes.ts";
import { sourceOf } from "./urlState/codec.ts";

/** Which page the current route shows. */
export function Routes() {
  const { locale, route, search } = useLocation();
  // `source=onrc` makes the main screen and the full-results URL ONRC's; without it (every link from before the picker) they are SEAP's
  const onrc = sourceOf(search) === "ONRC";
  const t = useCopy();
  switch (route.name) {
    case "main":
      return onrc ? <OnrcPage locale={locale} /> : <MainScreenPage locale={locale} />;
    case "search":
      // ONRC's matches are one list with its own paging: its full-results view is its main screen
      return onrc ? <OnrcPage locale={locale} /> : <SearchPage />;
    case "entity":
      return <EntityPage locale={locale} entity={route.entity} entityKey={route.key} view={route.view} />;
    case "record":
      return <RecordPage locale={locale} code={route.code} />;
    case "person":
      return <PersonPage locale={locale} id={route.id} />;
    case "coverage":
      return <CoveragePage locale={locale} />;
    case "methodology":
      return <MethodologyPage locale={locale} />;
    case "not-found":
      return (
        <NotFoundPage
          title={t.pages.notFound.title}
          action={<AppLink href={pathFor(locale, { name: "main" })}>{t.pages.notFound.back}</AppLink>}
        />
      );
  }
}
