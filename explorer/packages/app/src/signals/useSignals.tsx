import { useMemo, type ReactNode } from "react";
import { SignalCard, type Locale, type RecordSignalBadges, type SignalData } from "@grivei/ui";
import { useCopy } from "../copy/useCopy.ts";
import { navigate } from "../routing/location.tsx";
import { pathFor } from "../routing/routes.ts";
import { signalReproduceHref } from "./reproduceHref.ts";
import { signalMethodologyHref, signalSeapHref } from "./signalLinks.ts";

export interface SignalWiring {
  /** One Signal's card. `records` is what the page read of its Records (the first one is enough): "Check in SEAP" points at the Record of a one-Record Signal. */
  card: (signal: SignalData, records?: readonly { code: string; provenance?: { url: string | null } | null }[]) => ReactNode;
  /** The compact badges of a Record row: each links to the Signal's reproducing Records list. */
  badges: RecordSignalBadges;
}

/**
 * Everything a screen needs to show a Signal: the card and the compact badge, both built over the catalogue, the reproducing link
 * (`signalReproduceHref`), the methodology section of the rule and entity links in the language of the page. One place, so a Signal reads
 * and links the same on the Overview, the Records tab and the Record page.
 */
export function useSignals(locale: Locale): SignalWiring {
  const t = useCopy();
  return useMemo(() => {
    const entityHref = (e: { key: string }, role: "authority" | "supplier") => pathFor(locale, { name: "entity", entity: role, key: e.key, view: "overview" });
    // plain clicks on a Signal's links change page without a load; the links keep their real hrefs
    const onNavigate = (href: string) => navigate(href, "push");
    return {
      card: (signal, records = []) => (
        <SignalCard
          signal={signal}
          reproduceHref={signalReproduceHref(locale, signal)}
          methodologyHref={signalMethodologyHref(locale, signal.rule)}
          seapHref={signalSeapHref(signal, records)}
          entityHref={entityHref}
          onNavigate={onNavigate}
          locale={locale}
          copy={t.signalCard}
        />
      ),
      badges: {
        // a Record's row knows the Signal's rule, date, numbers and reproduce filter, not its authority entity: the filter names it
        href: (signal) => signalReproduceHref(locale, { authority: { key: String(signal.reproduce.authority ?? "") }, reproduce: signal.reproduce }),
        onNavigate,
        copy: t.signalCard,
      },
    };
  }, [locale, t]);
}
