import { useCopy } from "./copy/useCopy.ts";
import { AppLink } from "./components/AppLink/index.ts";
import { CoveragePage } from "./pages/CoveragePage/index.ts";
import { EntityPage } from "./pages/EntityPage/index.ts";
import { MainScreenPage } from "./pages/MainScreenPage/index.ts";
import { NotFoundPage } from "./pages/NotFoundPage/index.ts";
import { MethodologyPage } from "./pages/MethodologyPage/index.ts";
import { RecordPage } from "./pages/RecordPage/index.ts";
import { SearchPage } from "./pages/SearchPage/index.ts";
import { useLocation } from "./routing/location.tsx";
import { pathFor } from "./routing/routes.ts";

/** Which page the current route shows. */
export function Routes() {
  const { locale, route } = useLocation();
  const t = useCopy();
  switch (route.name) {
    case "main":
      return <MainScreenPage locale={locale} />;
    case "search":
      return <SearchPage />;
    case "entity":
      return <EntityPage locale={locale} entity={route.entity} entityKey={route.key} view={route.view} />;
    case "record":
      return <RecordPage locale={locale} code={route.code} />;
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
