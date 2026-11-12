import { forwardRef } from "react";
import MuiIconButton, { type IconButtonProps as MuiIconButtonProps } from "@mui/material/IconButton";

export type IconButtonProps = Omit<MuiIconButtonProps, "aria-label"> & {
  /** Required: an icon alone has no accessible name. */
  "aria-label": string;
};

/** Wraps MUI IconButton. Requires an accessible label; `type="button"` by default. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(props, ref) {
  return <MuiIconButton ref={ref} type="button" {...props} />;
});
