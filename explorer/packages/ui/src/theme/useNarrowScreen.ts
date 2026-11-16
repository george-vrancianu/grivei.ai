import useMediaQuery from "@mui/material/useMediaQuery";
import type { Theme } from "@mui/material/styles";

/** True below the `md` breakpoint (phones and small tablets). False where the screen cannot be asked (no `matchMedia`, as in tests). */
export function useNarrowScreen(): boolean {
  return useMediaQuery((theme: Theme) => theme.breakpoints.down("md"), { noSsr: true });
}
