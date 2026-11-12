import { Button } from "../../../../../atoms/Button/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";

export interface EmptyRecordsCopy {
  /** "No Records match these filters." */
  text: string;
  /** The button that switches the facets off. */
  clear: string;
}

export interface EmptyRecordsProps {
  copy: EmptyRecordsCopy;
  /** Present when facets are on: the way back to a filter that matches something. */
  onClear?: (() => void) | undefined;
}

/** The filter matches nothing: a sentence, and a way to clear the facets when some are on. */
export function EmptyRecords({ copy, onClear }: EmptyRecordsProps) {
  return (
    <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
      <Typography role="status">{copy.text}</Typography>
      {onClear && (
        <Button variant="outlined" size="small" onClick={onClear}>
          {copy.clear}
        </Button>
      )}
    </Stack>
  );
}
