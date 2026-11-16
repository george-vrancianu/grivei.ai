import type { Locale } from "../../../../../theme/index.ts";
import { Box } from "../../../../../atoms/Box/index.ts";
import { color, type } from "../../../../../theme/tokens.ts";
import { ApproxCount } from "../../../../atoms/ApproxCount/index.ts";

export interface TabLabelProps {
  /** The tab's name in the language ("Suppliers"). */
  name: string;
  count: number;
  /** An estimated distinct count shows "≈". */
  estimated: boolean;
  locale: Locale;
}

/** A tab's text: its name and, in a small pill (ground fill, hairline, round), the number of results it holds. */
export function TabLabel({ name, count, estimated, locale }: TabLabelProps) {
  return (
    <span>
      {name}{" "}
      <Box
        component="span"
        sx={{ display: "inline-block", px: "7px", py: "1px", backgroundColor: color.bg, border: `1px solid ${color.line}`, borderRadius: "10px", color: color.muted, fontSize: type.meta.size, fontWeight: 400, fontVariantNumeric: "tabular-nums" }}
      >
        <ApproxCount count={count} estimated={estimated} locale={locale} />
      </Box>
    </span>
  );
}
