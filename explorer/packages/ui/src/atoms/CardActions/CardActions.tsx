import { forwardRef } from "react";
import MuiCardActions, { type CardActionsProps as MuiCardActionsProps } from "@mui/material/CardActions";

export type CardActionsProps = MuiCardActionsProps;

/** Wraps MUI CardActions; every MUI prop, `sx` and ref passes through. Defaults come from the theme. */
export const CardActions = forwardRef<HTMLDivElement, CardActionsProps>(function CardActions(props, ref) {
  return <MuiCardActions ref={ref} {...props} />;
}) as typeof MuiCardActions;
