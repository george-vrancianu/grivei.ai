import { Typography } from "../../../../../atoms/Typography/index.ts";
import { HighlightedText } from "../../../../atoms/HighlightedText/index.ts";
import type { MatchableField, MatchedField } from "../../../../types.ts";

export interface MatchedLineCopy {
  /** "Matched in title": `field` is already the language's name for the field (`fields[...]`). */
  matchedIn: (field: string) => string;
  fields: Record<MatchableField, string>;
}

export interface MatchedLineProps {
  matchedField: MatchedField;
  copy: MatchedLineCopy;
}

/** "Matched in title: ..." with the matched text of the field highlighted. */
export function MatchedLine({ matchedField, copy }: MatchedLineProps) {
  return (
    <Typography component="div" variant="body2">
      <Typography component="span" variant="body2" color="text.secondary">
        {copy.matchedIn(copy.fields[matchedField.field])}:{" "}
      </Typography>
      <HighlightedText text={matchedField.text} highlights={matchedField.highlights} />
    </Typography>
  );
}
