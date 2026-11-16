import { Box } from "../../../atoms/Box/index.ts";
import { color } from "../../../theme/tokens.ts";

/** The 1 px, 28 px tall `lineStrong` rule that sets the Signals switch apart from the filter menus. Decoration (`aria-hidden`). */
export function FilterBarDivider() {
  return <Box component="span" aria-hidden="true" data-testid="filter-bar-divider" sx={{ flex: "none", width: "1px", height: 28, mx: "4px", backgroundColor: color.lineStrong }} />;
}
