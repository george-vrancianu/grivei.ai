import type { Locale } from "../../../../../theme/index.ts";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { type as typeScale } from "../../../../../theme/tokens.ts";
import { plainMethodologyText, renderMethodologyText } from "../MethodologySection/methodologyText.tsx";
import type { MethodologySectionCopy } from "../MethodologySection/index.ts";

export interface MethodologyProseProps {
  locale: Locale;
  /** The paragraphs and the list; the heading is the caller's. */
  copy: Omit<MethodologySectionCopy, "heading">;
}

const longText = { fontSize: typeScale.bodyLong.size, lineHeight: typeScale.bodyLong.lineHeight } as const;

/** The prose of a methodology section or a Signal rule panel: paragraphs in the long-text type, then the list (an item may name amounts of money). */
export function MethodologyProse({ locale, copy }: MethodologyProseProps) {
  return (
    <>
      {copy.paragraphs.map((text) => (
        <Typography key={text} sx={{ ...longText, mb: 1.5, "&:last-child": { mb: 0 } }}>
          {text}
        </Typography>
      ))}
      {copy.items && copy.items.length > 0 && (
        <Box component="ul" sx={{ mt: 0, mb: 0, pl: 3 }}>
          {copy.items.map((text) => (
            <Typography key={plainMethodologyText(text)} component="li" sx={{ ...longText, mb: 0.75 }}>
              {renderMethodologyText(text, locale)}
            </Typography>
          ))}
        </Box>
      )}
    </>
  );
}
