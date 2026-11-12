import type { ZoomedCountyQuery } from "@grivei/contract";
import { Box, Button, Typography, ZoomedCountyMap, type Locale, type ZoomedCountyMapCopy } from "@grivei/ui";
import type { UatTopologyState } from "../../geo/index.ts";

/** The strings the section adds around the map. */
export interface ZoomedCountySectionCopy {
  map: ZoomedCountyMapCopy;
  /** "Back to Romania": the way out of the zoom (clears the county and the UAT). */
  back: string;
  /** Heading of a zoomed county; Bucharest (`sectors`) shows its six sectors. */
  title: (countyName: string, sectors: boolean) => string;
  /** "Results for Sânpetru": which UAT the results are narrowed to, with the way to take it back. */
  selectedUat: (uatName: string) => string;
  clearUat: string;
}

export interface ZoomedCountySectionProps {
  /** The zoomed county's ISO code (`RO-BV`). */
  county: string;
  /** `ZoomedCounty` answer for the page's filter; null while it loads or when it failed. */
  data: ZoomedCountyQuery | null;
  loading: boolean;
  failed: boolean;
  topology: UatTopologyState;
  /** The filter's `uat` (SIRUTA): the URL is its only home. */
  uat: string | undefined;
  onSelectUat: (siruta: string) => void;
  onClearUat: () => void;
  onBack: () => void;
  locale: Locale;
  copy: ZoomedCountySectionCopy;
  /** What to say while things load, when the outlines cannot be loaded and when the query failed. */
  status: { loading: string; unavailable: string; failed: string };
}

/**
 * The Money lens zoomed into one county: the UAT choropleth (Bucharest by its sectors) for one search, with the UAT as a filter
 * value and a way back to the country. A missing outlines file or a failed query says so here and leaves the results working.
 */
export function ZoomedCountySection({ county, data, loading, failed, topology, uat, onSelectUat, onClearUat, onBack, locale, copy, status }: ZoomedCountySectionProps) {
  const countyName = data?.uats[0]?.county.name ?? county;
  const selectedName = uat === undefined ? undefined : (data?.uats.find((u) => u.siruta === uat)?.name ?? uat);
  const map = data?.seap.search.uatMap ?? null;

  let body;
  if (topology.status === "error") body = <Typography role="alert">{status.unavailable}</Typography>;
  else if (failed) body = <Typography role="alert">{status.failed}</Typography>;
  else if (topology.status === "loading" || map === null || loading) body = <Typography aria-busy="true">{status.loading}</Typography>;
  else
    body = (
      <ZoomedCountyMap
        map={map}
        topology={topology.topology}
        {...(uat !== undefined ? { selected: uat } : {})}
        onSelect={onSelectUat}
        showAuthorityCircles
        locale={locale}
        copy={copy.map}
      />
    );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Button variant="outlined" size="small" onClick={onBack}>
          {copy.back}
        </Button>
        {data && (
          <Typography variant="h6" component="h2">
            {copy.title(countyName, county === "RO-B")}
          </Typography>
        )}
      </Box>
      {selectedName !== undefined && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography>{copy.selectedUat(selectedName)}</Typography>
          <Button size="small" onClick={onClearUat}>
            {copy.clearUat}
          </Button>
        </Box>
      )}
      {body}
    </Box>
  );
}
