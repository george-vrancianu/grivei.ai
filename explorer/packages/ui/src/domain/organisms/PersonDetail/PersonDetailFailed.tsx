import type { ReactNode } from "react";
import { Card } from "../../../atoms/Card/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { PersonBreadcrumb } from "./components/PersonBreadcrumb/index.ts";
import { PersonFrame } from "./components/PersonFrame/index.ts";
import type { PersonDetailCopy } from "./PersonDetail.tsx";

export interface PersonDetailFailedProps {
  copy: Pick<PersonDetailCopy, "privateView" | "breadcrumb">;
  homeHref: string;
  onNavigate?: ((href: string) => void) | undefined;
  /** The error note with its retry (a `StateNote kind="error"`): the person is one query, so the one failure sits in the person panel. */
  children: ReactNode;
}

/** The person page when its request failed: the notice and the person panel with its breadcrumb, holding the error note. */
export function PersonDetailFailed({ copy, homeHref, onNavigate, children }: PersonDetailFailedProps) {
  return (
    <PersonFrame privateView={copy.privateView}>
      <Card component="header" sx={{ p: 0, minWidth: 0 }}>
        <Stack spacing={1.75} sx={{ px: 2.5, pt: 2.5, pb: 2.25, minWidth: 0 }}>
          <PersonBreadcrumb homeHref={homeHref} onNavigate={onNavigate} copy={copy.breadcrumb} />
          {children}
        </Stack>
      </Card>
    </PersonFrame>
  );
}
