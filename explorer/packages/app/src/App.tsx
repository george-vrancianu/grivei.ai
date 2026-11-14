import { useEffect } from "react";
import { UiProvider } from "@grivei/ui";
import { AppShell, type NavItem } from "./components/AppShell/index.ts";
import { catalogue } from "./copy/index.ts";
import { CountyTopologyProvider, UatTopologyProvider, type LoadCountyTopology, type LoadUatTopology } from "./geo/index.ts";
import { ClientProvider } from "./graphql/ClientContext.tsx";
import type { GraphqlClient } from "./graphql/client.ts";
import { Routes } from "./Routes.tsx";
import { LocationProvider, useLocation } from "./routing/location.tsx";
import { pathFor, switchLocalePath, type Route } from "./routing/routes.ts";

export interface AppProps {
  client?: GraphqlClient;
  /** Loads the county outlines the Money lens draws; defaults to `/geo/counties.topo.json`. Tests hand in a small topology. */
  loadCountyTopology?: LoadCountyTopology;
  /** Loads one county's UAT outlines (`RO-BV`) for the zoomed county; defaults to `/geo/uats/<county>.topo.json`. */
  loadUatTopology?: LoadUatTopology;
}

/** The nav item a page belongs to: entity and Record pages are part of exploring; an unknown path has none. */
function navItemOf(route: Route): NavItem | null {
  switch (route.name) {
    case "main":
    case "entity":
    case "record":
    case "person":
      return "explore";
    case "search":
    case "coverage":
    case "methodology":
      return route.name;
    case "not-found":
      return null;
  }
}

function Shell() {
  const { locale, pathname, search, hash, route } = useLocation();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const other = locale === "en" ? "ro" : "en";
  return (
    <UiProvider locale={locale}>
      <AppShell
        copy={catalogue[locale]}
        current={navItemOf(route)}
        switchTo={{ locale: other, href: switchLocalePath(pathname, search, other, hash) }}
        links={{
          explore: pathFor(locale, { name: "main" }),
          search: pathFor(locale, { name: "search" }),
          coverage: pathFor(locale, { name: "coverage" }),
          methodology: pathFor(locale, { name: "methodology" }),
        }}
      >
        <Routes />
      </AppShell>
    </UiProvider>
  );
}

/** The app: the browser location is the router state; every page sits in the shell. */
export function App({ client, loadCountyTopology, loadUatTopology }: AppProps) {
  return (
    <ClientProvider {...(client ? { client } : {})}>
      <CountyTopologyProvider {...(loadCountyTopology ? { load: loadCountyTopology } : {})}>
        <UatTopologyProvider {...(loadUatTopology ? { load: loadUatTopology } : {})}>
          <LocationProvider>
            <Shell />
          </LocationProvider>
        </UatTopologyProvider>
      </CountyTopologyProvider>
    </ClientProvider>
  );
}
