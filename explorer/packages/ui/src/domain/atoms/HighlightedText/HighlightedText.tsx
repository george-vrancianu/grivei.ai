import { Box } from "../../../atoms/Box/index.ts";
import { color } from "../../../theme/tokens.ts";
import { splitByRanges } from "./highlightedText.utils.ts";

export interface HighlightedTextProps {
  text: string;
  /** `MatchedField.highlights`: `[start, end)` pairs in UTF-16 code units. */
  highlights: readonly (readonly number[])[];
}

/** Text with exactly the highlighted ranges wrapped in `<mark>`: an amber fill with dark text, on the matched part only. */
export function HighlightedText({ text, highlights }: HighlightedTextProps) {
  return (
    <span>
      {splitByRanges(text, highlights).map((part, index) =>
        part.marked ? (
          <Box key={index} component="mark" sx={{ bgcolor: color.accent, color: color.onAccent }}>
            {part.text}
          </Box>
        ) : (
          part.text
        ),
      )}
    </span>
  );
}
