import type { KeyboardEvent } from "react";

export type AreaPathProps = {
  code: string;
  d: string;
  fill: string;
  label: string;
  selected: boolean;
  active: boolean;
  describedBy: string | undefined;
  onSelect: ((code: string) => void) | undefined;
  onActivate: (code: string | null) => void;
};

/**
 * One area. With `onSelect` it is a button (Enter and Space select); without, an image, so nothing that does nothing is announced as a button.
 * Either way it is focusable, and hover and focus show its tooltip.
 */
export function AreaPath({ code, d, fill, label, selected, active, describedBy, onSelect, onActivate }: AreaPathProps) {
  const onKeyDown = (event: KeyboardEvent<SVGPathElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(code);
    }
  };
  return (
    <path
      d={d}
      fill={fill}
      role={onSelect ? "button" : "img"}
      tabIndex={0}
      aria-label={label}
      aria-pressed={onSelect ? selected : undefined}
      aria-describedby={describedBy}
      data-code={code}
      data-active={active}
      data-clickable={onSelect !== undefined}
      onClick={() => onSelect?.(code)}
      onKeyDown={onKeyDown}
      onPointerEnter={() => onActivate(code)}
      onPointerLeave={() => onActivate(null)}
      onFocus={() => onActivate(code)}
      onBlur={() => onActivate(null)}
    />
  );
}
