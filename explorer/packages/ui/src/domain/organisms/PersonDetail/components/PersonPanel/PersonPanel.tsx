import type { ReactNode } from "react";
import { Card } from "../../../../../atoms/Card/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Breadcrumb, type BreadcrumbCopy } from "../../../../molecules/Breadcrumb/index.ts";

export interface PersonPanelProps {
  homeHref: string;
  onNavigate?: ((href: string) => void) | undefined;
  breadcrumb: BreadcrumbCopy & { current: string };
  /** Under the breadcrumb: the name and the figures, a skeleton of them, or the error note. */
  children: ReactNode;
}

/** The person panel's shell: a `Card` (`header`) with no header strip, its body the breadcrumb and then what it is given. */
export function PersonPanel({ homeHref, onNavigate, breadcrumb, children }: PersonPanelProps) {
  return (
    <Card component="header" sx={{ p: 0, minWidth: 0 }}>
      <Stack spacing={1.75} sx={{ px: 2.5, pt: 2.5, pb: 2.25, minWidth: 0 }}>
        <Breadcrumb current={breadcrumb.current} homeHref={homeHref} onNavigate={onNavigate} copy={breadcrumb} />
        {children}
      </Stack>
    </Card>
  );
}
