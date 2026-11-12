import { forwardRef } from "react";
import MuiLink, { type LinkProps as MuiLinkProps } from "@mui/material/Link";

export type LinkProps = MuiLinkProps;

/** Wraps MUI Link. An external link (`target="_blank"`) gets `rel="noopener noreferrer"`. */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ target, rel, ...props }, ref) {
  const safeRel = target === "_blank" ? [...new Set(`${rel ?? ""} noopener noreferrer`.trim().split(/\s+/))].join(" ") : rel;
  return <MuiLink ref={ref} target={target} rel={safeRel} {...props} />;
}) as typeof MuiLink;
