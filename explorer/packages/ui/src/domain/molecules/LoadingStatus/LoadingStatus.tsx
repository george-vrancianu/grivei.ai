import { CircularProgress } from "../../../atoms/CircularProgress/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";

export interface LoadingStatusProps {
  /** The text beside the spinner ("Loading…"), from the catalogue; it is what a screen reader announces. */
  label: string;
}

/** A small spinner and a `role="status"` line: "a request is in flight" (the results header's slot on the main screen). The spinner is decoration. */
export function LoadingStatus({ label }: LoadingStatusProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <CircularProgress size={14} aria-hidden="true" />
      <Typography variant="caption" role="status">
        {label}
      </Typography>
    </Stack>
  );
}
