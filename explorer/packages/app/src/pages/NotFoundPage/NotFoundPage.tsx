import type { ReactNode } from "react";
import { Stack, Typography } from "@grivei/ui";

export interface NotFoundPageProps {
  title: string;
  /** Something to do next: a link back to the main screen. */
  action: ReactNode;
}

/** The page for a path no route owns: a title and the way back. */
export function NotFoundPage({ title, action }: NotFoundPageProps) {
  return (
    <Stack component="main" spacing={2} sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" component="h1">
        {title}
      </Typography>
      {action}
    </Stack>
  );
}
