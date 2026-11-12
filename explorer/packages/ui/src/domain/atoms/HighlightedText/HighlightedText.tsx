import { Box } from "../../../atoms/Box/index.ts";
import { splitByRanges } from "./highlightedText.utils.ts";

export interface HighlightedTextProps {
  text: string;
  /** `MatchedField.highlights`: `[start, end)` pairs in UTF-16 code units. */
  highlights: readonly (readonly number[])[];
}

/** Text with exactly the highlighted ranges wrapped in `<mark>`. */
export function HighlightedText({ text, highlights }: HighlightedTextProps) {
  return (
    <span>
      {splitByRanges(text, highlights).map((part, index) =>
        part.marked ? (
          <Box key={index} component="mark" sx={{ bgcolor: "warning.light", color: "inherit", borderRadius: 0.5 }}>
            {part.text}
          </Box>
        ) : (
          part.text
        ),
      )}
    </span>
  );
}
