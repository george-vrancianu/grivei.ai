/** Every string the search bar shows. */
export interface SearchBarCopy {
  /** The field's visible label. */
  label: string;
  /** Says the data is in Romanian and gives an example. */
  placeholder: string;
  /** The hint line under the field: what can be searched and what is ignored. Replaced by `minLengthHint` while the query is too short. */
  hint: string;
  /** The accessible name of the clear button. */
  clear: string;
  /** The accessible name of the busy indicator. */
  loading: string;
  /** Shown quietly while the query is one character (too short to search). */
  minLengthHint: string;
}
