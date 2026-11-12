import { useMemo } from "react";
import type { Locale, RecordSignalBadges, SignalCardProps, SignalData } from "@grivei/ui";
import { useCopy } from "../copy/useCopy.ts";
import { navigate } from "../routing/location.tsx";
import { pathFor } from "../routing/routes.ts";
import { badgeReproduceHref, signalReproduceHref } from "./reproduceHref.ts";
import { signalMethodologyHref, signalSeapHref } from "./signalLinks.ts";

export interface SignalLinks {
  /**
   * Everything a `SignalCard` needs but the Signal: the reproducing link, the methodology section of the rule, entity links, the copy. `records` is what the
   * page read of its Records (the first one is enough): "Check in SEAP" points at the Record of a one-Record Signal. The page renders the card.
   */
  cardProps: (signal: SignalData, records?: readonly { code: string; provenance?: { url: string | null } | null }[]) => Omit<SignalCardProps, "signal">;
  /** The compact badges of a Record row: each links to the Signal's reproducing Records list. */
  badges: RecordSignalBadges;
}

/**
 * The links and copy of a Signal in the language of the page, one place, so a Signal reads and links the same on the Overview, the Records tab
 * and the Record page. Only data and handlers: the screens render the card and the badge.
 */
export function useSignalLinks(locale: Locale): SignalLinks {
  const t = useCopy();
  return useMemo(() => {
    const entityHref = (e: { key: string }, role: "authority" | "supplier") => pathFor(locale, { name: "entity", entity: role, key: e.key, view: "overview" });
    // plain clicks on a Signal's links change page without a load; the links keep their real hrefs
    const onNavigate = (href: string) => navigate(href, "push");
    return {
      cardProps: (signal, records = []) => ({
        reproduceHref: signalReproduceHref(locale, signal),
        methodologyHref: signalMethodologyHref(locale, signal.rule),
        seapHref: signalSeapHref(signal, records),
        entityHref,
        onNavigate,
        locale,
        copy: t.signalCard,
      }),
      badges: {
        href: (signal) => badgeReproduceHref(locale, signal.reproduce),
        onNavigate,
        copy: t.signalCard,
      },
    };
  }, [locale, t]);
}
