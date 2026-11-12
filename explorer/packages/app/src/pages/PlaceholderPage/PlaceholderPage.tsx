import type { ReactNode } from "react";
import { Stack, Typography } from "@grivei/ui";

export interface PlaceholderPageProps {
  title: string;
  body: string;
  /** Source data the route carries (an entity key, a Record code), shown as given. */
  detail?: string;
  /** Something to do next, e.g. a link back. */
  action?: ReactNode;
}

/** What every route shows until its own ticket builds it. */
export function PlaceholderPage({ title, body, detail, action }: PlaceholderPageProps) {
  return (
    <Stack component="main" spacing={2} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" component="h1">
        {title}
      </Typography>
      {detail !== undefined && <Typography data-testid="route-detail">{detail}</Typography>}
      <Typography>{body}</Typography>
      {action}
    </Stack>
  );
}
