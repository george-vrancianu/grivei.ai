import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { color } from "../../../../../theme/tokens.ts";
import type { GraphLegendCopy } from "../../relationshipsTab.types.ts";
import { CENTRE_COLOR, CONTRACT_COLOR, DIRECT_PURCHASE_COLOR, NEUTRAL_MARK_COLOR, NODE_FILL, SIGNAL_RING_COLOR, WON_TOGETHER_DASH } from "../../relationshipsTab.utils.ts";

export interface GraphLegendProps {
  copy: GraphLegendCopy;
  /** Only explain what the graph can show: a dashed edge only when some counterparty won together with the entity. */
  hasWonTogether: boolean;
  hasSignals: boolean;
}

const item = { display: "flex", alignItems: "center", gap: 1 } as const;
const icon = { flex: "none" } as const;

/**
 * What the graph's marks mean: the centre, node size, the two channel colours (and the rule that picks one: the channel holding the most RON
 * with that counterparty), the dashed edge and the Signal ring. A wrapping row of marks, as the drawing has it.
 */
export function GraphLegend({ copy, hasWonTogether, hasSignals }: GraphLegendProps) {
  const edge = (stroke: string, dash?: string) => (
    <Box component="svg" aria-hidden width={28} height={10} sx={icon}>
      <line x1={0} y1={5} x2={28} y2={5} stroke={stroke} strokeWidth={3} strokeDasharray={dash} />
    </Box>
  );
  return (
    <Box component="section" aria-label={copy.title} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Typography variant="meta" component="h4" sx={{ color: color.text, fontWeight: 600 }}>{copy.title}</Typography>
      <Typography variant="meta" component="p" data-legend="edge-rule" sx={{ m: 0 }}>{copy.edgeColour}</Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", gap: "6px 20px", color: color.text2 }}>
        <Box component="li" data-legend="centre" sx={item}>
          <Box component="svg" aria-hidden width={22} height={22} sx={icon}><circle cx={11} cy={11} r={8} fill={CENTRE_COLOR} /></Box>
          <Typography variant="meta">{copy.centre}</Typography>
        </Box>
        <Box component="li" data-legend="size" sx={item}>
          <Box component="svg" aria-hidden width={28} height={22} sx={icon}>
            <circle cx={7} cy={14} r={4} fill={NODE_FILL} stroke={NEUTRAL_MARK_COLOR} strokeWidth={2} />
            <circle cx={19} cy={11} r={8} fill={NODE_FILL} stroke={NEUTRAL_MARK_COLOR} strokeWidth={2} />
          </Box>
          <Typography variant="meta">{copy.size}</Typography>
        </Box>
        <Box component="li" data-legend="contract" sx={item}>{edge(CONTRACT_COLOR)}<Typography variant="meta">{copy.contract}</Typography></Box>
        <Box component="li" data-legend="direct-purchase" sx={item}>{edge(DIRECT_PURCHASE_COLOR)}<Typography variant="meta">{copy.directPurchase}</Typography></Box>
        {hasWonTogether && (
          <Box component="li" data-legend="won-together" sx={item}>{edge(NEUTRAL_MARK_COLOR, WON_TOGETHER_DASH)}<Typography variant="meta">{copy.wonTogether}</Typography></Box>
        )}
        {hasSignals && (
          <Box component="li" data-legend="signals" sx={item}>
            <Box component="svg" aria-hidden width={22} height={22} sx={icon}>
              <circle cx={11} cy={11} r={8} fill="none" stroke={SIGNAL_RING_COLOR} strokeWidth={3} />
            </Box>
            <Typography variant="meta">{copy.signals}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
