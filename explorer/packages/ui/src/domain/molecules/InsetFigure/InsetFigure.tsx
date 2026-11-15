import type { ReactNode } from "react";
import { Link } from "../../../atoms/Link/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { Well } from "../../../atoms/Well/index.ts";
import { type } from "../../../theme/tokens.ts";
import { neutralLinkSx } from "../../utils/neutralLinkSx.ts";

export interface InsetFigureProps {
  /** What the figure counts: mono 12 px, muted. */
  label: string;
  /** The figure: mono 18 px, 600. */
  children: ReactNode;
  /** Makes the whole figure a link (the suspect Records). The link reads in the body colour: amber is for the headline Total alone. */
  href?: string;
}

/** A secondary figure sunk into its panel: the label over the value, in a well. It grows from 200 px and wraps under its neighbours on a narrow screen. */
export function InsetFigure({ label, children, href }: InsetFigureProps) {
  const text = (
    <>
      <Typography variant="meta" component="span">
        {label}
      </Typography>{" "}
      <Typography variant="money" component="span" sx={{ fontSize: type.figure.size, color: "text.primary", overflowWrap: "anywhere" }}>
        {children}
      </Typography>
    </>
  );
  return (
    <Well component="p" sx={{ flex: "1 1 200px", minWidth: 0, m: 0, px: 2, py: 1.5, display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.5 }}>
      {href === undefined ? (
        text
      ) : (
        <Link href={href} underline="hover" sx={{ ...neutralLinkSx, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {text}
        </Link>
      )}
    </Well>
  );
}
