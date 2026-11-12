import { MethodologyPage as MethodologyPageView, Stack, type Locale } from "@grivei/ui";
import { useCopy } from "../../copy/useCopy.ts";
import { methodologyHref } from "../../methodology/methodologyLinks.ts";
import { navigate, useLocation } from "../../routing/location.tsx";
import { useMethodologyBaseRates } from "./hooks/useMethodologyBaseRates.ts";

export interface MethodologyPageProps {
  locale: Locale;
}

/** `/explore/methodology` ("About the numbers" / "Despre cifre"): the prose is the catalogue's, the Signal rules' windows and base rates come from `signalRules`. */
export function MethodologyPage({ locale }: MethodologyPageProps) {
  const t = useCopy();
  const { hash } = useLocation();
  const baseRates = useMethodologyBaseRates();
  const anchor = decodeAnchor(hash);
  return (
    <Stack component="main" spacing={2} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <MethodologyPageView
        baseRates={baseRates}
        anchor={anchor}
        sectionHref={(id) => `${methodologyHref(locale)}#${id}`}
        // a plain click on a contents link changes the fragment without a load; the links keep their real hrefs
        onNavigate={(href) => navigate(href, "push")}
        locale={locale}
        copy={t.methodology}
      />
    </Stack>
  );
}

/** The fragment as an element id, or null for none or a malformed one. */
function decodeAnchor(hash: string): string | null {
  if (hash.length < 2) return null;
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
}
