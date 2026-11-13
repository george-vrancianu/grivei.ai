import type { Locale } from "../../../../../theme/index.ts";
import { Box } from "../../../../../atoms/Box/index.ts";
import { color } from "../../../../../theme/tokens.ts";
import { ApproxCount } from "../../../../atoms/ApproxCount/index.ts";

export interface TabLabelProps {
  /** The tab's name in the language ("Suppliers"). */
  name: string;
  count: number;
  /** An estimated distinct count shows "≈". */
  estimated: boolean;
  locale: Locale;
}

/** A tab's text: its name and the number of results it holds. */
export function TabLabel({ name, count, estimated, locale }: TabLabelProps) {
  return (
    <span>
      {name}{" "}
      <Box component="span" sx={{ color: color.muted }}>
        <ApproxCount count={count} estimated={estimated} locale={locale} />
      </Box>
    </span>
  );
}
