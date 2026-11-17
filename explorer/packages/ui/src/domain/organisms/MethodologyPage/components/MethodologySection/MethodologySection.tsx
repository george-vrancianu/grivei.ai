import type { ReactNode } from "react";
import type { Locale } from "../../../../../theme/index.ts";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { MethodologyProse } from "../MethodologyProse/index.ts";
import type { MethodologyText } from "./methodologyText.tsx";

export interface MethodologySectionCopy {
  heading: string;
  /** The prose, one paragraph each. */
  paragraphs: readonly string[];
  /** A list after the paragraphs (the exact rule, the cases it covers), one item each; an item may name amounts of money. */
  items?: readonly MethodologyText[];
}

export interface MethodologySectionProps {
  /** The anchor: the section element's id, the same in both languages (the heading is `<id>-heading`, the section's name). */
  id: string;
  locale: Locale;
  copy: MethodologySectionCopy;
  /** The heading row's right end: a loading status for the group the section holds. */
  aside?: ReactNode;
  /** Shown after the prose: a closing line, the Signal rules' panels. */
  children?: ReactNode;
}

/** One section of the article: behind a hairline, a 24 px `h2`, its paragraphs and list, and anything the caller adds. The `section` carries the anchor and is named by its heading. */
export function MethodologySection({ id, locale, copy, aside, children }: MethodologySectionProps) {
  const headingId = `${id}-heading`;
  return (
    <Box component="section" id={id} aria-labelledby={headingId} sx={{ borderTop: 1, borderColor: "divider", pt: 3, mt: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", columnGap: 2, rowGap: 0.5, mb: 1.5 }}>
        <Typography id={headingId} variant="h2" component="h2">
          {copy.heading}
        </Typography>
        {aside}
      </Box>
      <MethodologyProse locale={locale} copy={copy} />
      {children}
    </Box>
  );
}
