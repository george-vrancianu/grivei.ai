import { Box, Typography } from "@grivei/ui";
import type { Copy } from "../../../../copy/index.ts";

export interface FooterProps {
  copy: Copy["footer"];
}

/** The footer of every page: where the data comes from, and that Signals are counted, never scored. */
export function Footer({ copy }: FooterProps) {
  return (
    <Box component="footer" sx={{ mt: "auto", borderTop: 1, borderColor: "divider", bgcolor: "background.default" }}>
      <Box sx={{ maxWidth: (theme) => theme.graf.layout.maxWidth, mx: "auto", px: (theme) => theme.graf.layout.gutter, py: 2.25, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "6px 24px" }}>
        <Typography variant="meta" component="span">{copy.provenance}</Typography>
        <Typography variant="meta" component="span">{copy.signals}</Typography>
      </Box>
    </Box>
  );
}
