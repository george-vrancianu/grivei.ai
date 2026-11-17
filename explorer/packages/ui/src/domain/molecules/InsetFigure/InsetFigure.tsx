import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { Well } from "../../../atoms/Well/index.ts";
import { focusRing, selected as selectedSx } from "../../../theme/states.ts";
import { type } from "../../../theme/tokens.ts";
import { neutralLinkSx } from "../../utils/neutralLinkSx.ts";

export interface InsetFigureProps {
  /** What the figure counts: mono 12 px, muted. */
  label: string;
  /** The figure: mono 18 px, 600. */
  children: ReactNode;
  /** Makes the whole figure a link (the suspect Records). The link reads in the body colour: amber is for the headline Total alone. */
  href?: string;
  /** An optional third line under the value: what the figure rests on, such as a window or a caveat (mono 12 px, muted). With `href` it is part of the link. */
  note?: ReactNode;
  /** Makes the figure a toggle (the ONRC count map's Unplaced tile): a button with `aria-pressed` that calls `onSelect` on a click. `selected` is its pressed state, drawn with the shared `selected` look (`theme/states.ts`). Not with `href`. */
  onSelect?: () => void;
  selected?: boolean;
}

/** A secondary figure sunk into its panel: the label over the value, then an optional `note`, in a well. It grows from 200 px and wraps under its neighbours on a narrow screen. */
export function InsetFigure({ label, children, href, note, onSelect, selected = false }: InsetFigureProps) {
  const text = (
    <>
      <Typography variant="meta" component="span">
        {label}
      </Typography>{" "}
      <Typography variant="money" component="span" sx={{ fontSize: type.figure.size, color: "text.primary", overflowWrap: "anywhere" }}>
        {children}
      </Typography>
      {note != null && (
        <>
          {" "}
          <Typography variant="meta" component="span">
            {note}
          </Typography>
        </>
      )}
    </>
  );
  const toggle = onSelect !== undefined && href === undefined;
  return (
    <Well
      component="p"
      edge="line"
      sx={{ flex: "1 1 200px", minWidth: 0, m: 0, px: 2, py: 1.5, display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.5, ...(selected && selectedSx) }}
    >
      {toggle ? (
        <Box
          component="button"
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          sx={{ all: "unset", cursor: "pointer", display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0, color: "text.primary", "&:focus-visible": focusRing }}
        >
          {text}
        </Box>
      ) : href === undefined ? (
        text
      ) : (
        <Link href={href} underline="hover" sx={{ ...neutralLinkSx, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {text}
        </Link>
      )}
    </Well>
  );
}
