import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { Tag } from "../../../../atoms/Tag/index.ts";
import { listRowSx } from "../../../../utils/listSx.ts";
import { followLink } from "../../../../utils/followLink.ts";

/** One row of the Roles list: the organisation at the left, the role held at the right. The shell is shared with the skeleton. */
export function PersonRoleRowShell({ children }: { children: ReactNode }) {
  return (
    <Box component="li" sx={{ ...listRowSx, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
      {children}
    </Box>
  );
}

export interface PersonRoleRowProps {
  organisationName: string;
  /** The organisation's entity page; absent when it has none (a plain name). */
  href: string | null;
  onNavigate?: ((href: string) => void) | undefined;
  /** The line under the name: its key ("CUI 3100020"), or "no organisation page". */
  detail: string;
  /** The role held, shown as a tag. */
  role: string;
}

/** An organisation (a link when it has a page, else plain), its detail line in mono muted, and the role held as a tag. */
export function PersonRoleRow({ organisationName, href, onNavigate, detail, role }: PersonRoleRowProps) {
  return (
    <PersonRoleRowShell>
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        {href !== null ? (
          <Link href={href} onClick={followLink(href, onNavigate)}>
            <strong>{organisationName}</strong>
          </Link>
        ) : (
          <strong>{organisationName}</strong>
        )}
        <Typography variant="meta" component="span">
          {detail}
        </Typography>
      </Stack>
      <Typography variant="body2" component="span" sx={{ flex: "none", maxWidth: "50%", display: "flex" }}>
        <Tag>{role}</Tag>
      </Typography>
    </PersonRoleRowShell>
  );
}
