import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { color, layout, radius, shadow } from "../../../../../theme/tokens.ts";
import { pageSx } from "../../../../utils/pageSx.ts";

export interface PrivateViewCopy {
  /** The notice's bold lead, e.g. "Private view:". */
  lead: string;
  /** The rest of the sentence: this page exists only where the host reveals Restricted content (ADR 0015). */
  text: string;
}

export interface PersonFrameProps {
  privateView: PrivateViewCopy;
  children: ReactNode;
}

/** The lock at the start of the notice: decorative, so hidden from assistive technology. */
function LockIcon() {
  return (
    <Box component="svg" aria-hidden="true" viewBox="0 0 24 24" width={18} height={18} sx={{ flex: "none", mt: "2px", color: "text.secondary" }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Box>
  );
}

/** The person page's `main` (960 px wide) and the Private view notice on the overlay surface, shown in every state: it is a statement about the page, not about its data. */
export function PersonFrame({ privateView, children }: PersonFrameProps) {
  return (
    <Stack component="main" spacing={2.5} sx={{ ...pageSx, maxWidth: layout.personMaxWidth }}>
      <Box
        role="note"
        sx={{
          display: "flex", alignItems: "flex-start", gap: 1.5, px: 2, py: 1.5,
          backgroundColor: color.overlay, border: `1px solid ${color.lineStrong}`, borderRadius: `${radius.card}px`, boxShadow: shadow.overlay,
        }}
      >
        <LockIcon />
        <Typography variant="body2">
          <strong>{privateView.lead}</strong> {privateView.text}
        </Typography>
      </Box>
      {children}
    </Stack>
  );
}
