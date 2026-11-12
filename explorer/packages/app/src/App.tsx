import { UiProvider } from "@grivei/ui";
import { ClientProvider } from "./graphql/ClientContext.tsx";
import type { GraphqlClient } from "./graphql/client.ts";
import { localeFromPath } from "./locale.ts";
import { MainScreenPage } from "./pages/MainScreenPage/index.ts";

export interface AppProps {
  /** The location's pathname; the route split is only the language prefix until the shell (#42) lands. */
  path: string;
  client?: GraphqlClient;
}

export function App({ path, client }: AppProps) {
  const locale = localeFromPath(path);
  return (
    <UiProvider locale={locale}>
      <ClientProvider {...(client ? { client } : {})}>
        <MainScreenPage locale={locale} />
      </ClientProvider>
    </UiProvider>
  );
}
