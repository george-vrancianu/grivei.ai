import { NotFoundPanel } from "@grivei/ui";
import type { Locale } from "@grivei/ui";
import { useCopy } from "../../copy/useCopy.ts";
import { navigate } from "../../routing/location.tsx";
import { pathFor } from "../../routing/routes.ts";

export interface NotFoundPageProps {
  locale: Locale;
  title: string;
  /** One sentence: what to do about it. */
  body: string;
}

/** The one not-found panel for the unknown address, an entity, a person and a Record: its own title and sentence, and the two ways on (the main screen, Search). */
export function NotFoundPage({ locale, title, body }: NotFoundPageProps) {
  const t = useCopy();
  return (
    <NotFoundPanel
      title={title}
      body={body}
      primary={{ label: t.pages.notFound.back, href: pathFor(locale, { name: "main" }) }}
      secondary={{ label: t.pages.notFound.search, href: pathFor(locale, { name: "search" }) }}
      onNavigate={(href) => navigate(href, "push")}
    />
  );
}
