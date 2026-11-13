import { Box } from "../../../atoms/Box/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { color, radius } from "../../../theme/tokens.ts";
import { visuallyHidden } from "../../utils/visuallyHidden.ts";
import { CopyLinkButton, type CopyLinkButtonCopy } from "../CopyLinkButton/index.ts";
import { withoutScheme } from "./citeLine.utils.ts";

export interface CiteLineCopy {
  /** "Cite this view" / "Address of this page": the line's name. */
  label: string;
  copyLink: CopyLinkButtonCopy;
}

export interface CiteLineProps {
  /** The full URL, scheme included: it is what the copy button puts on the clipboard. The line shows it without the scheme. */
  url: string;
  copy: CiteLineCopy;
  /** A bordered bar with the label visible (the full-results view); unframed, the label is for screen readers only (beside the Record's title). */
  framed?: boolean;
}

/** The citable address of a view, with a button that copies it. */
export function CiteLine({ url, copy, framed = false }: CiteLineProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        flexWrap: "wrap",
        minWidth: 0,
        ...(framed ? { p: 1.5, bgcolor: color.panel, border: `1px solid ${color.line}`, borderRadius: `${radius.card}px` } : {}),
      }}
    >
      <Typography variant="meta" component="span" sx={framed ? undefined : visuallyHidden}>
        {copy.label}
        {framed ? null : ": "}
      </Typography>
      <Typography variant="meta" component="span" sx={{ flex: "1 1 12rem", minWidth: 0, overflowWrap: "anywhere", color: color.text2 }}>
        {withoutScheme(url)}
      </Typography>
      <CopyLinkButton url={url} copy={copy.copyLink} />
    </Box>
  );
}
