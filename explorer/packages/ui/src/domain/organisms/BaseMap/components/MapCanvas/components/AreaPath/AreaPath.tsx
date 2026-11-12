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

/** One area: a button for keyboard and screen-reader users (Enter and Space select), hover and focus show its tooltip. */
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
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
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
