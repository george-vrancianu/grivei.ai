import type { Locale } from "../../../../../theme/index.ts";
import { ApproxCount } from "../../../../atoms/ApproxCount/index.ts";
import { CountPill } from "../../../../atoms/CountPill/index.ts";

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
      <CountPill>
        <ApproxCount count={count} estimated={estimated} locale={locale} />
      </CountPill>
    </span>
  );
}
