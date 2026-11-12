import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";

export interface MethodologySectionCopy {
  heading: string;
  /** The prose, one paragraph each. */
  paragraphs: readonly string[];
  /** A list after the paragraphs (the exact rule, the cases it covers), one item each. */
  items?: readonly string[];
}

export interface MethodologySectionProps {
  /** The anchor: the heading's id, the same in both languages. */
  id: string;
  /** 2 for a section of the page, 3 for a Signal rule inside the Signal rules' section. */
  level?: 2 | 3;
  copy: MethodologySectionCopy;
  /** Shown after the prose: the base-rate slot, a closing line. */
  children?: ReactNode;
}

/** One section of the page: a heading that carries the anchor, its paragraphs and list, and anything the caller adds. */
export function MethodologySection({ id, level = 2, copy, children }: MethodologySectionProps) {
  return (
    <Box component="section" aria-labelledby={id}>
      <Typography id={id} variant={level === 2 ? "h5" : "h6"} component={level === 2 ? "h2" : "h3"} sx={{ scrollMarginTop: 16, mb: 1 }}>
        {copy.heading}
      </Typography>
      {copy.paragraphs.map((text) => (
        <Typography key={text} sx={{ mb: 1 }}>
          {text}
        </Typography>
      ))}
      {copy.items && copy.items.length > 0 && (
        <Box component="ul" sx={{ mt: 0, mb: 1, pl: 3 }}>
          {copy.items.map((text) => (
            <Typography key={text} component="li" sx={{ mb: 0.5 }}>
              {text}
            </Typography>
          ))}
        </Box>
      )}
      {children}
    </Box>
  );
}
