import type { ReactNode } from "react";
import type { Locale } from "../../../../../theme/index.ts";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Card } from "../../../../../atoms/Card/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { type as typeScale } from "../../../../../theme/tokens.ts";
import { plainMethodologyText, renderMethodologyText, type MethodologyText } from "./methodologyText.tsx";

export interface MethodologySectionCopy {
  heading: string;
  /** The prose, one paragraph each. */
  paragraphs: readonly string[];
  /** A list after the paragraphs (the exact rule, the cases it covers), one item each; an item may name amounts of money. */
  items?: readonly MethodologyText[];
}

export interface MethodologySectionProps {
  /** The anchor: the heading's id, the same in both languages. */
  id: string;
  /** 2 for a section of the page, 3 for a Signal rule inside the Signal rules' section (drawn as a card). */
  level?: 2 | 3;
  locale: Locale;
  copy: MethodologySectionCopy;
  /** Shown after the prose: the base-rate slot, a closing line. */
  children?: ReactNode;
}

const longText = { fontSize: typeScale.bodyLong.size, lineHeight: typeScale.bodyLong.lineHeight } as const;
const cardSx = { p: 2.5 } as const;

/** One section of the page: a heading that carries the anchor, its paragraphs and list, and anything the caller adds. */
export function MethodologySection({ id, level = 2, locale, copy, children }: MethodologySectionProps) {
  const content = (
    <>
      <Typography id={id} variant={level === 2 ? "h2" : "h3"} component={level === 2 ? "h2" : "h3"} sx={{ scrollMarginTop: 16, mb: 1.5 }}>
        {copy.heading}
      </Typography>
      {copy.paragraphs.map((text) => (
        <Typography key={text} sx={{ ...longText, mb: 1.5 }}>
          {text}
        </Typography>
      ))}
      {copy.items && copy.items.length > 0 && (
        <Box component="ul" sx={{ mt: 0, mb: 1.5, pl: 3 }}>
          {copy.items.map((text) => (
            <Typography key={plainMethodologyText(text)} component="li" sx={{ ...longText, mb: 0.75 }}>
              {renderMethodologyText(text, locale)}
            </Typography>
          ))}
        </Box>
      )}
      {children}
    </>
  );
  return level === 3 ? (
    <Card component="section" aria-labelledby={id} sx={cardSx}>
      {content}
    </Card>
  ) : (
    <Box component="section" aria-labelledby={id}>
      {content}
    </Box>
  );
}
