import { Box } from "../../../atoms/Box/index.ts";
import { Button } from "../../../atoms/Button/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { useCopyLink } from "./hooks/useCopyLink.ts";

export interface CopyLinkButtonCopy {
  /** The button's name ("Copy link"). */
  label: string;
  /** Said in the live region once the link is on the clipboard. */
  copied: string;
  /** Said when the browser has no clipboard or refuses it. */
  failed: string;
}

export interface CopyLinkButtonProps {
  /** What goes on the clipboard: the full, citable URL. */
  url: string;
  copy: CopyLinkButtonCopy;
}

/** A small outlined button that copies a URL, with the result written beside it in a polite live region (empty until the button is used). */
export function CopyLinkButton({ url, copy }: CopyLinkButtonProps) {
  const { status, copy: copyToClipboard } = useCopyLink(url);
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Button type="button" size="small" variant="outlined" onClick={() => void copyToClipboard()}>
        {copy.label}
      </Button>
      <Typography variant="meta" role="status" aria-live="polite" component="span" sx={{ color: status === "failed" ? "text.primary" : "text.secondary" }}>
        {status === "idle" ? "" : copy[status]}
      </Typography>
    </Box>
  );
}
