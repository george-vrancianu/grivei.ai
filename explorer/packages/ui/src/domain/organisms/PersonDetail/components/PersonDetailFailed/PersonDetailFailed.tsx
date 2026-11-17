import type { ReactNode } from "react";
import type { PersonDetailCopy } from "../../PersonDetail.tsx";
import { PersonFrame } from "../PersonFrame/index.ts";
import { PersonPanel } from "../PersonPanel/index.ts";

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
      <PersonPanel homeHref={homeHref} onNavigate={onNavigate} breadcrumb={copy.breadcrumb}>
        {children}
      </PersonPanel>
    </PersonFrame>
  );
}
