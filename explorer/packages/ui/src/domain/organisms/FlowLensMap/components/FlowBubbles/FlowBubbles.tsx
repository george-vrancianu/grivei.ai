import { BUBBLE_FILL, BUBBLE_OUTLINE, type FlowBubble } from "../../flowLensMap.utils.ts";

export interface FlowBubblesProps {
  bubbles: readonly FlowBubble[];
}

/** One circle per county with money, centred on the county, area proportional to its awarded value. Decorative for assistive tech: the county's own name says the figures. */
export function FlowBubbles({ bubbles }: FlowBubblesProps) {
  return (
    <g data-flow-bubbles aria-hidden="true" pointerEvents="none">
      {bubbles.map((bubble) => (
        <circle key={bubble.code} data-bubble data-county={bubble.code} cx={bubble.x} cy={bubble.y} r={bubble.r} fill={BUBBLE_FILL} fillOpacity={0.55} stroke={BUBBLE_OUTLINE} strokeWidth={1.25} />
      ))}
    </g>
  );
}
