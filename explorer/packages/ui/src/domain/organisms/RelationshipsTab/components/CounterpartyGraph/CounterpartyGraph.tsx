import type { KeyboardEvent } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatMoney } from "../../../../atoms/MoneyAmount/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import type { EntityRef, RelationshipsCounterparties } from "../../../../types.ts";
import type { CounterpartyGraphCopy, RelationshipsTabCopy } from "../../relationshipsTab.types.ts";
import {
  CENTRE_COLOR, CENTRE_RADIUS, GRAPH_HEIGHT, GRAPH_WIDTH, SIGNAL_RING_COLOR, WON_TOGETHER_DASH, channelColor, layoutNodes, type GraphNode,
} from "../../relationshipsTab.utils.ts";

export interface CounterpartyGraphProps {
  /** The entity whose page this is: the centre. */
  entity: EntityRef;
  counterparties: RelationshipsCounterparties;
  /** The picked counterparty's key (an Entity key) or null. */
  selected: string | null;
  onSelect: (key: string | null) => void;
  locale: Locale;
  copy: Pick<RelationshipsTabCopy, "recordCount" | "channels"> & { graph: CounterpartyGraphCopy };
}

const MAX_LABEL = 22;
const shorten = (text: string) => (text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1)}…` : text);

/**
 * The radial graph: the entity in the centre and its top counterparties around it. Node area = money, edge and node colour = the channel
 * that carries more of it, dashed edge = won together, orange ring = has Signals. React draws the SVG; D3 supplies the scales and the layout maths.
 * A node with an Entity is a button (click, Enter or Space picks it, picking it again clears the pick); a natural person is only a labelled mark.
 */
export function CounterpartyGraph({ entity, counterparties, selected, onSelect, locale, copy }: CounterpartyGraphProps) {
  const nodes = layoutNodes(counterparties.rows);
  const rest = counterparties.count - counterparties.rows.length;
  if (nodes.length === 0) {
    return <Typography color="text.secondary">{copy.graph.empty}</Typography>;
  }
  const money = (bani: string) => formatMoney(bani, locale);
  const nameOf = (node: GraphNode) => (node.row.naturalPerson || !node.row.entity ? copy.graph.naturalPerson : node.row.entity.displayName);
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
        sx={{ width: "100%", height: "auto", maxHeight: 520, display: "block", "& [role=button]": { cursor: "pointer" }, "& [role=button]:focus-visible": { outline: "none" }, "& [role=button]:focus-visible circle.focus": { stroke: "#111827", strokeWidth: 3 } }}
      >
        {nodes.map((node, i) => (
          <line
            key={`edge-${i}`}
            data-edge={node.key ?? `person-${i}`}
            data-channel={node.channel}
            data-won-together={node.row.wonTogether}
            x1={0} y1={0} x2={node.x} y2={node.y}
            stroke={channelColor(node.channel)}
            strokeWidth={node.key !== null && node.key === selected ? 4 : 2}
            strokeOpacity={selected !== null && node.key !== selected ? 0.45 : 0.9}
            strokeDasharray={node.row.wonTogether ? WON_TOGETHER_DASH : undefined}
          />
        ))}
        <circle r={CENTRE_RADIUS} fill={CENTRE_COLOR} data-centre />
        <text y={CENTRE_RADIUS + 14} textAnchor="middle" fontSize={12} fontWeight={600} fill="currentColor">{shorten(entity.displayName)}</text>
        {nodes.map((node, i) => {
          const isSelected = node.key !== null && node.key === selected;
          const label = copy.graph.node(nameParts(node, isSelected));
          const pickable = node.key !== null;
          return (
            <g
              key={node.key ?? `person-${i}`}
              role={pickable ? "button" : "img"}
              aria-label={label}
              aria-pressed={pickable ? isSelected : undefined}
              tabIndex={pickable ? 0 : undefined}
              onClick={pickable ? () => pick(node) : undefined}
              onKeyDown={pickable ? onKeyDown(node) : undefined}
              transform={`translate(${node.x} ${node.y})`}
              data-node={node.key ?? "person"}
              data-selected={isSelected}
            >
              <title>{label}</title>
              {node.row.hasSignals && <circle r={node.r + 5} fill="none" stroke={SIGNAL_RING_COLOR} strokeWidth={3} data-ring />}
              <circle className="focus" r={node.r} fill={channelColor(node.channel)} fillOpacity={isSelected ? 1 : 0.7} stroke={isSelected ? "#111827" : channelColor(node.channel)} strokeWidth={isSelected ? 3 : 1.5} data-radius={node.r} />
              <text y={node.r + (node.row.hasSignals ? 19 : 14)} textAnchor="middle" fontSize={11} fill="currentColor" aria-hidden="true">{shorten(nameOf(node))}</text>
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
