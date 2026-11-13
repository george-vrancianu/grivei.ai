import type { KeyboardEvent } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { grafStates, type Locale } from "../../../../../theme/index.ts";
import { color, font } from "../../../../../theme/tokens.ts";
import { formatMoney } from "../../../../atoms/MoneyAmount/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import type { EntityRef, RelationshipsCounterparties } from "../../../../types.ts";
import type { CounterpartyGraphCopy, RelationshipsTabCopy } from "../../relationshipsTab.types.ts";
import {
  CENTRE_COLOR, CENTRE_RADIUS, GRAPH_HEIGHT, GRAPH_WIDTH, NODE_FILL, SELECTED_STROKE, SIGNAL_RING_COLOR, WON_TOGETHER_DASH, channelColor, layoutNodes, type GraphNode,
} from "../../relationshipsTab.utils.ts";

export interface CounterpartyGraphProps {
  /** The entity whose page this is: the centre. */
  entity: EntityRef;
  counterparties: RelationshipsCounterparties;
  /** The picked counterparty's key (an Entity key) or null. */
  selected: string | null;
  onSelect: (key: string | null) => void;
  locale: Locale;
  copy: Pick<RelationshipsTabCopy, "recordCount"> & { graph: CounterpartyGraphCopy };
}

const MAX_LABEL = 22;
/** A pickable node's label sits below its keyboard focus ring (r + 9, 3px stroke) and the Signal ring inside it. */
const LABEL_BELOW_FOCUS_RING = 24;
const shorten = (text: string) => (text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1)}…` : text);

/**
 * The radial graph: the entity in the centre and its top counterparties around it. Node area = money, edge and node colour = the channel
 * holding the most RON with that counterparty, dashed edge = won together, amber ring = has Signals. React draws the SVG; D3 supplies the scales and the layout maths.
 * A node with an Entity is a button (click, Enter or Space picks it, picking it again clears the pick); a natural person is only a labelled mark.
 */
export function CounterpartyGraph({ entity, counterparties, selected, onSelect, locale, copy }: CounterpartyGraphProps) {
  const nodes = layoutNodes(counterparties.rows);
  const rest = counterparties.count - counterparties.rows.length;
  if (nodes.length === 0) {
    return <Typography color="text.secondary">{copy.graph.empty}</Typography>;
  }
  const money = (bani: string) => formatMoney(bani, locale);
  // No Entity is either a natural person (ADR 0003) or the unidentified group (money nobody could link to an Entity): never call the latter a person.
  const nameOf = (node: GraphNode) => (node.row.entity && !node.row.naturalPerson ? node.row.entity.displayName : node.row.naturalPerson ? copy.graph.naturalPerson : copy.graph.unknown);
  const kindOf = (node: GraphNode) => (node.row.naturalPerson ? "person" : "unknown");
  const nameParts = (node: GraphNode, isSelected: boolean) => ({
    name: nameOf(node),
    amount: money(node.row.total.awarded),
    records: copy.recordCount(node.row.total.records, formatCount(node.row.total.records, node.row.total.estimated, locale)),
    contract: money(node.row.viaContract.awarded),
    directPurchase: money(node.row.viaDirectPurchase.awarded),
    wonTogether: node.row.wonTogether,
    hasSignals: node.row.hasSignals,
    selected: isSelected,
  });
  const pick = (node: GraphNode) => {
    if (node.key !== null) onSelect(selected === node.key ? null : node.key);
  };
  const onKeyDown = (node: GraphNode) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(node);
    }
  };
  return (
    <Box>
      <Box
        component="svg"
        role="group"
        aria-label={copy.graph.label}
        viewBox={`${-GRAPH_WIDTH / 2} ${-GRAPH_HEIGHT / 2} ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
        sx={{
          width: "100%", height: "auto", maxHeight: 520, display: "block", color: color.text, fontFamily: font.mono,
          "& [role=button]": { cursor: "pointer" },
          // Unpicked nodes only: the hover stroke (1.5) would otherwise override the picked node's selection stroke (3) while the pointer is on it.
          "& [role=button][aria-pressed=false]:hover circle[data-radius]": grafStates.mapArea.hover, "& [role=button]:focus-visible": { outline: "none" }, "& circle[data-focus-ring]": { display: "none", ...grafStates.mapArea.focus }, "& [role=button]:focus-visible circle[data-focus-ring]": { display: "inline" },
        }}
      >
        {nodes.map((node, i) => (
          <line
            key={`edge-${i}`}
            data-edge={node.key ?? `${kindOf(node)}-${i}`}
            data-channel={node.channel}
            data-won-together={node.row.wonTogether}
            x1={0} y1={0} x2={node.x} y2={node.y}
            stroke={channelColor(node.channel)}
            strokeWidth={node.edgeWidth}
            strokeLinecap="round"
            strokeOpacity={selected !== null && node.key !== selected ? 0.45 : 1}
            strokeDasharray={node.row.wonTogether ? WON_TOGETHER_DASH : undefined}
          />
        ))}
        <circle r={CENTRE_RADIUS} fill={CENTRE_COLOR} data-centre />
        <text y={CENTRE_RADIUS + 14} textAnchor="middle" fontSize={12} fontWeight={600} fill="currentColor" stroke={color.panel} strokeWidth={4} paintOrder="stroke">{shorten(entity.displayName)}</text>
        {nodes.map((node, i) => {
          const isSelected = node.key !== null && node.key === selected;
          const label = copy.graph.node(nameParts(node, isSelected));
          const pickable = node.key !== null;
          return (
            <g
              key={node.key ?? `${kindOf(node)}-${i}`}
              role={pickable ? "button" : "img"}
              aria-label={label}
              aria-pressed={pickable ? isSelected : undefined}
              tabIndex={pickable ? 0 : undefined}
              onClick={pickable ? () => pick(node) : undefined}
              onKeyDown={pickable ? onKeyDown(node) : undefined}
              transform={`translate(${node.x} ${node.y})`}
              data-node={node.key ?? kindOf(node)}
              data-selected={isSelected}
            >
              <title>{label}</title>
              {node.row.hasSignals && <circle r={node.r + 5} fill="none" stroke={SIGNAL_RING_COLOR} strokeWidth={3} data-ring />}
              {/* A ring outside the node and its Signal ring, shown on keyboard focus only: selection (fill and stroke) never draws it. */}
              {pickable && <circle r={node.r + 9} fill="none" data-focus-ring />}
              <circle r={node.r} fill={isSelected ? channelColor(node.channel) : NODE_FILL} stroke={isSelected ? SELECTED_STROKE : channelColor(node.channel)} strokeWidth={isSelected ? 3 : 2} data-radius={node.r} />
              <text y={node.r + (pickable ? LABEL_BELOW_FOCUS_RING : node.row.hasSignals ? 19 : 14)} textAnchor="middle" fontSize={11} fill="currentColor" stroke={color.panel} strokeWidth={4} paintOrder="stroke" aria-hidden="true">{shorten(nameOf(node))}</text>
            </g>
          );
        })}
      </Box>
      {rest > 0 && (
        <Typography variant="body2" color="text.secondary">{copy.graph.more(rest, formatCount(rest, false, locale))}</Typography>
      )}
    </Box>
  );
}
