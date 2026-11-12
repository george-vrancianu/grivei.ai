import type { MoneyMapFieldsFragment } from "@grivei/contract";
import { MoneyLensMap, Typography, type CountySide, type Locale, type MoneyLensMapCopy } from "@grivei/ui";
import type { CountyTopologyState } from "../../geo/index.ts";
import { countyAfterClick, countyAfterSideChange } from "./moneyLensSection.utils.ts";

export interface MoneyLensSectionProps {
  /** The money map of the current search; null while it loads or when the search failed (the page says so). */
  map: MoneyMapFieldsFragment | null;
  /** The search is in flight: say so in the map's place (a failed search leaves it empty). */
  loading: boolean;
  topology: CountyTopologyState;
  /** The filter's `county` and `countySide`: the URL is their only home. */
  county: string | undefined;
  side: CountySide;
  /** The county the filter should now hold (`undefined` clears it) and, when the side changed, the side. */
  onChange: (next: { county: string | undefined; side?: CountySide }) => void;
  locale: Locale;
  copy: MoneyLensMapCopy;
  /** What to say when the outlines cannot be loaded, and while they load. */
  status: { unavailable: string; loading: string };
}

/** The Money lens of the main screen: the county map and its tiles for one search, with the county and side as filter values. */
export function MoneyLensSection({ map, loading, topology, county, side, onChange, locale, copy, status }: MoneyLensSectionProps) {
  if (topology.status === "error") return <Typography role="alert">{status.unavailable}</Typography>;
  if (topology.status === "loading" || (map === null && loading)) return <Typography aria-busy="true">{status.loading}</Typography>;
  if (map === null) return null;
  return (
    <MoneyLensMap
      map={map}
      topology={topology.topology}
      {...(county !== undefined ? { selected: county } : {})}
      onSelect={(area) => onChange({ county: countyAfterClick(county, area) })}
      side={side}
      onSideChange={(next) => onChange({ county: countyAfterSideChange(county, next), side: next })}
      locale={locale}
      copy={copy}
    />
  );
}
