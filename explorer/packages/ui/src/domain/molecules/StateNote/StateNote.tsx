import type { ReactNode } from "react";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { color, radius } from "../../../theme/tokens.ts";

export type StateKind = "loading" | "error" | "empty";

export interface StateNoteProps {
  /** What the reader is told: loading is announced politely, an error as an alert, an empty result is plain text. */
  kind: StateKind;
  /** The sentence. */
  children: ReactNode;
  /** Optional: what the reader can do next (a link or button), under the sentence. Empty states grow here (a link to the Coverage lens). */
  action?: ReactNode;
}

const ROLES = { loading: "status", error: "alert", empty: undefined } as const;

/** One state of a screen region on the dark ground: a bordered note in the panel colour (the error's border is the strong line, never red), with an optional next step. */
export function StateNote({ kind, children, action }: StateNoteProps) {
  return (
    <Stack
      spacing={1}
      role={ROLES[kind]}
      data-state={kind}
      sx={{ p: 2, bgcolor: color.panel, border: `1px ${kind === "loading" ? "dashed" : "solid"} ${kind === "error" ? color.lineStrong : color.line}`, borderRadius: `${radius.card}px` }}
    >
      <Typography variant="label" component="p" color={kind === "error" ? "text.primary" : "text.secondary"}>
        {children}
      </Typography>
      {action}
    </Stack>
  );
}
