import { useEffect } from "react";
import { UiProvider } from "@grivei/ui";
import { AppShell } from "./components/AppShell/index.ts";
import { catalogue } from "./copy/index.ts";
import { CountyTopologyProvider, type LoadCountyTopology } from "./geo/index.ts";
import { ClientProvider } from "./graphql/ClientContext.tsx";
import type { GraphqlClient } from "./graphql/client.ts";
import { Routes } from "./Routes.tsx";
import { LocationProvider, useLocation } from "./routing/location.tsx";
import { pathFor, switchLocalePath } from "./routing/routes.ts";

export interface AppProps {
  client?: GraphqlClient;
  /** Loads the county outlines the Money lens draws; defaults to `/geo/counties.topo.json`. Tests hand in a small topology. */
  loadCountyTopology?: LoadCountyTopology;
}

function Shell() {
  const { locale, pathname, search } = useLocation();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const other = locale === "en" ? "ro" : "en";
  return (
    <UiProvider locale={locale}>
      <AppShell
        copy={catalogue[locale]}
        switchTo={{ locale: other, href: switchLocalePath(pathname, search, other) }}
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
export function App({ client, loadCountyTopology }: AppProps) {
  return (
    <ClientProvider {...(client ? { client } : {})}>
      <CountyTopologyProvider {...(loadCountyTopology ? { load: loadCountyTopology } : {})}>
        <LocationProvider>
          <Shell />
        </LocationProvider>
      </CountyTopologyProvider>
    </ClientProvider>
  );
}
