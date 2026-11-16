import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Card } from "../../../atoms/Card/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { SectionHeading } from "../../atoms/SectionHeading/index.ts";
import { STRIP_BASE } from "../../../theme/stripFill.ts";
import { PanelFoot } from "./components/PanelFoot/index.ts";

interface PanelBaseProps {
  /** The header strip's right slot: a short meta line (mono 12, muted) or one control (a toggle, a select, a close button). */
  aside?: ReactNode;
  /** The foot strip under the body: a count, a caveat sentence, paging or a "show all" link. Several children sit at the left and right ends. Absent, the panel has no foot. */
  foot?: ReactNode;
  /** The body has no padding and no gap: for a list or a table, whose rows bring their own 12 px 16 px padding. */
  flush?: boolean;
  /** The heading level's element: `h3` under a tab's own `h2` (the default), `h2` on a page whose title is the `h1`. */
  level?: "h2" | "h3";
  /** The element id, for a link to the panel (`#onrc`). */
  id?: string;
  children: ReactNode;
}

/** A plain-text title names the region by itself; any other header content needs `label` for the region's name. */
export type PanelProps = PanelBaseProps &
  (
    | {
        /** The panel's title, a mono accent label. */
        heading: string;
        /** Accessible name of the region, when it differs from the heading. */
        label?: string;
      }
    | {
        /** Header content beyond plain text (the Signal card's ring beside its rule label): rendered as given inside the heading element (a flex row, `h3` type, the text colour: no mono, no accent), in the header strip's left. */
        heading: ReactNode;
        /** Accessible name of the region; required because the heading is not plain text. */
        label: string;
      }
  );

const stripSx = STRIP_BASE;

/**
 * The titled panel: a `Card` (the theme's panel fill, hairline and radius) in three parts. The header strip holds the mono accent heading and an optional right slot (`aside`);
 * the body is padded (16 px, 12 px gap) or `flush` for a list or table; the optional `foot` strip sits under it. Used on tabs (under the tab's own `h2`), the Record page and the entity page.
 * The strips use the theme's strip fill (`FilterStrip`'s) and `line` hairlines only; the panel adds no colour, shadow or amber of its own.
 */
export function Panel({ heading, label, level = "h3", id, aside, foot, flush = false, children }: PanelProps) {
  return (
    <Card
      component="section"
      id={id}
      aria-label={label ?? (typeof heading === "string" ? heading : undefined)}
      sx={{ p: 0, display: "flex", flexDirection: "column", minWidth: 0 }}
    >
      <Box
        data-panel-part="header"
        sx={{ ...stripSx, borderBottomWidth: 1, borderTopLeftRadius: "inherit", borderTopRightRadius: "inherit", px: 2, py: "9px" }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", columnGap: 2, rowGap: 0.5, minHeight: 28 }}>
          {typeof heading === "string" ? (
            <SectionHeading component={level}>{heading}</SectionHeading>
          ) : (
            <Typography variant="h3" component={level} sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              {heading}
            </Typography>
          )}
          {aside != null && (
            <Typography variant="meta" component="div" sx={{ display: "flex", alignItems: "center", minWidth: 0, ml: "auto" }}>
              {aside}
            </Typography>
          )}
        </Box>
      </Box>
      <Box data-panel-part="body" sx={flush ? { minWidth: 0, ...(foot == null && { overflow: "hidden", borderBottomLeftRadius: "inherit", borderBottomRightRadius: "inherit" }) } : { p: 2, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
        {children}
      </Box>
      {foot != null && <PanelFoot>{foot}</PanelFoot>}
    </Card>
  );
}
