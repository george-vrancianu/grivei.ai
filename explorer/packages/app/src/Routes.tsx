import { useCopy } from "./copy/useCopy.ts";
import { AppLink } from "./components/AppLink/index.ts";
import { MainScreenPage } from "./pages/MainScreenPage/index.ts";
import { PlaceholderPage } from "./pages/PlaceholderPage/index.ts";
import { SearchPage } from "./pages/SearchPage/index.ts";
import { useLocation } from "./routing/location.tsx";
import { pathFor } from "./routing/routes.ts";

/** Which page the current route shows. Each placeholder is replaced by its own ticket's page. */
export function Routes() {
  const { locale, route } = useLocation();
  const t = useCopy();
  const body = t.pages.placeholder;
  switch (route.name) {
    case "main":
      return <MainScreenPage locale={locale} />;
    case "search":
      return <SearchPage />;
    case "entity":
      return <PlaceholderPage title={t.pages[route.entity][route.view]} body={body} detail={route.key} />;
    case "record":
      return <PlaceholderPage title={t.pages.record.title} body={body} detail={route.code} />;
    case "coverage":
      return <PlaceholderPage title={t.pages.coverage.title} body={body} />;
    case "methodology":
      return <PlaceholderPage title={t.pages.methodology.title} body={body} />;
    case "not-found":
      return (
        <PlaceholderPage
          title={t.pages.notFound.title}
          body=""
          action={<AppLink href={pathFor(locale, { name: "main" })}>{t.pages.notFound.back}</AppLink>}
        />
      );
  }
}
