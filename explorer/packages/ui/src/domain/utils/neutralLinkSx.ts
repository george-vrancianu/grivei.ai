import { color } from "../../theme/tokens.ts";

/** A link beside a number reads in the body colour: amber is for the headline Total alone (spec #95). */
export const neutralLinkSx = { color: color.text2, "&:hover": { color: color.text } } as const;
