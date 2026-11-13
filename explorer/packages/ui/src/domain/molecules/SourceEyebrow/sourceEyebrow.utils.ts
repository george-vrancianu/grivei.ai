/** One Source as the eyebrow needs it: the API's `Source` (`id`, `name`) is assignable to this. */
export interface SourceOption {
  id: string;
  name: string;
}

/** The Source's name from the API, or its id when there is no list (the page keeps the last list it received, so the line does not jump on a new query). */
export function sourceNameOf(sources: readonly SourceOption[], id: string): string {
  return sources.find((source) => source.id === id)?.name ?? id;
}
