import type { Locale } from "../../../theme/index.ts";
import type { DataThrough } from "../../types.ts";

export interface DataThroughDateCopy {
  /** The words between the record kind and the date, e.g. "data through" / "date până la". */
  through: string;
}

export interface DataThroughDateProps {
  /** One entry of `Source.dataThrough`: a record kind of the Source and its date. */
  dataThrough: DataThrough;
  locale: Locale;
  copy: DataThroughDateCopy;
  /** What to show for the kind. Kinds are the Source's own vocabulary, so the code as published is the default. */
  kindLabel?: string;
}

/** "CONTRACT: data through 30 September 2024", the date in a `<time>` element. English uses day-month-year (en-GB) like Romanian. */
export function DataThroughDate({ dataThrough, locale, copy, kindLabel }: DataThroughDateProps) {
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${dataThrough.date}T00:00:00Z`),
  );
  return (
    <span>
      {kindLabel ?? dataThrough.kind}: {copy.through} <time dateTime={dataThrough.date}>{date}</time>
    </span>
  );
}
