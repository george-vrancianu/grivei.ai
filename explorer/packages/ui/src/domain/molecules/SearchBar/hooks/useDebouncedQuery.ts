import { useCallback, useEffect, useRef, useState } from "react";
import { queryFor } from "../searchBar.utils.ts";

export interface DebouncedQueryOptions {
  /** The committed query (the URL's). A change that this hook did not emit is outside and resets the text. */
  value: string;
  onQueryChange: (query: string) => void;
  debounceMs: number;
  minLength: number;
}

/** The input text, and the debounced emission of the query it stands for. */
export function useDebouncedQuery({ value, onQueryChange, debounceMs, minLength }: DebouncedQueryOptions) {
  const [text, setTextState] = useState(value);
  const lastEmitted = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const emit = useRef(onQueryChange);
  useEffect(() => {
    emit.current = onQueryChange;
  });

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const commit = useCallback((query: string) => {
    if (query === lastEmitted.current) return; // never the same query twice
    lastEmitted.current = query;
    emit.current(query);
  }, []);

  // The committed query changed from outside (Back, a removed chip, a link): show it.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    cancel();
    setTextState(value);
  }, [value, cancel]);

  useEffect(() => cancel, [cancel]);

  const setText = useCallback(
    (next: string) => {
      setTextState(next);
      cancel();
      const query = queryFor(next, minLength);
      if (query === null) return;
      timer.current = setTimeout(() => commit(query), debounceMs);
    },
    [cancel, commit, debounceMs, minLength],
  );

  /** Empties the box and asks for the empty search at once. */
  const clear = useCallback(() => {
    cancel();
    setTextState("");
    commit("");
  }, [cancel, commit]);

  return { text, setText, clear };
}
