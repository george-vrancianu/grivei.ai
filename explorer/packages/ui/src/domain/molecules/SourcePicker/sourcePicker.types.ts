export interface SourcePickerOption {
  /** The Source's id (`SEAP`, `ONRC`). */
  id: string;
  /** The Source's name, from the API. */
  label: string;
  /** What the Source has for the current query, already worded and formatted ("1,204 Records"); absent = none shown (no query, still loading, or failed). */
  count?: string | undefined;
}

export interface SourcePickerCopy {
  /** The group's accessible name ("Source"). */
  label: string;
}
