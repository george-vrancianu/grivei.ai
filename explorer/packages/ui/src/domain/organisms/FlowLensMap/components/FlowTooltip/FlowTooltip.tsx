import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { EntityRole, Total } from "../../../../types.ts";
import { AreaFigures } from "../../../MoneyLensMap/index.ts";
import type { FlowLensMapCopy } from "../../flowLensMap.types.ts";

export interface FlowTooltipProps {
  name: string;
  /** The county's Total, or undefined when the flow has no row for it. */
  total: Total | undefined;
  role: EntityRole;
  /** Whether this county is the entity's own. */
  isHome: boolean;
  /** The entity's county name; null when unknown (no direction is then claimed). */
  homeName: string | null;
  locale: Locale;
  copy: Pick<FlowLensMapCopy, "map" | "tiles" | "tooltip">;
}

/** What the map's tooltip says about a county: its name, its exact money and Records, and which way the money flows (or that it is the entity's own county). */
export function FlowTooltip({ name, total, role, isHome, homeName, locale, copy }: FlowTooltipProps) {
  return (
    <>
      <Typography component="span" variant="subtitle2" sx={{ display: "block" }}>{name}</Typography>
      {total ? (
        <AreaFigures total={total} locale={locale} copy={copy.tiles} />
      ) : (
        <Typography component="span" variant="body2" sx={{ display: "block" }}>{copy.map.noData}</Typography>
      )}
      {isHome ? (
        <Typography component="span" variant="caption" sx={{ display: "block" }}>{copy.tooltip.homeCounty}</Typography>
      ) : (
        total && homeName && <Typography component="span" variant="caption" sx={{ display: "block" }}>{copy.tooltip.direction[role](homeName)}</Typography>
      )}
    </>
  );
}
