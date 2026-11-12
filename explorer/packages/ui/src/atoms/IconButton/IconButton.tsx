import { forwardRef } from "react";
import MuiIconButton, { type IconButtonProps as MuiIconButtonProps } from "@mui/material/IconButton";

export type IconButtonProps = Omit<MuiIconButtonProps, "aria-label"> & {
  /** Required: an icon alone has no accessible name. */
  "aria-label": string;
  /** MUI's ButtonBase renders an anchor when given an href. */
  href?: string;
};

/** Wraps MUI IconButton. Requires an accessible label; `type="button"` by default (not when it is a link). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(props, ref) {
  const typeDefault = props.href ? {} : { type: "button" as const };
  return <MuiIconButton ref={ref} {...typeDefault} {...props} />;
});
