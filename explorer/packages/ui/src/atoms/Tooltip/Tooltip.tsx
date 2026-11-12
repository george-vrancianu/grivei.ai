import { forwardRef, type ReactElement } from "react";
import MuiTooltip, { type TooltipProps as MuiTooltipProps } from "@mui/material/Tooltip";

export type TooltipProps = MuiTooltipProps;

/**
 * Wraps MUI Tooltip. A disabled child fires no pointer events, so MUI's tooltip would never
 * open on it; such a child is wrapped in a focusable span that carries the tooltip.
 */
export const Tooltip = forwardRef<HTMLElement, TooltipProps>(function Tooltip({ children, ...props }, ref) {
  const child = children as ReactElement<{ disabled?: boolean }>;
  const target = child.props.disabled ? (
    <span tabIndex={0} style={{ display: "inline-block" }}>
      {child}
    </span>
  ) : (
    child
  );
  return (
    <MuiTooltip ref={ref} {...props}>
      {target}
    </MuiTooltip>
  );
});
