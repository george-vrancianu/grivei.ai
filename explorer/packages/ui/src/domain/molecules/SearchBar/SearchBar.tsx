import { useRef } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { CircularProgress } from "../../../atoms/CircularProgress/index.ts";
import { IconButton } from "../../../atoms/IconButton/index.ts";
import { TextField } from "../../../atoms/TextField/index.ts";
import { useDebouncedQuery } from "./hooks/useDebouncedQuery.ts";
import type { SearchBarCopy } from "./searchBar.types.ts";
import { DEFAULT_DEBOUNCE_MS, DEFAULT_MIN_LENGTH, isTooShort } from "./searchBar.utils.ts";

export type { SearchBarCopy } from "./searchBar.types.ts";

export interface SearchBarProps {
  /** The committed query (the URL's). Changing it from outside replaces what is typed. */
  value: string;
  /** The query to search for: the trimmed text once it is long enough and typing has paused, or "" when emptied. */
  onQueryChange: (query: string) => void;
  /** A search is running: shows a quiet indicator and marks the bar busy. */
  loading?: boolean;
  /** Pause after the last keystroke before emitting. */
  debounceMs?: number;
  /** Shorter queries are not searched. */
  minLength?: number;
  copy: SearchBarCopy;
}

/** The free-text search box. Presentational: it emits the query; the page fetches. */
export function SearchBar({ value, onQueryChange, loading = false, debounceMs = DEFAULT_DEBOUNCE_MS, minLength = DEFAULT_MIN_LENGTH, copy }: SearchBarProps) {
  const { text, setText, clear } = useDebouncedQuery({ value, onQueryChange, debounceMs, minLength });
  const input = useRef<HTMLInputElement>(null);
  const clearAndFocus = () => {
    clear();
    input.current?.focus();
  };
  const tooShort = isTooShort(text, minLength);
  return (
    <Box role="search" aria-busy={loading}>
      <TextField
        type="search"
        label={copy.label}
        placeholder={copy.placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && text !== "") {
            event.preventDefault();
            clearAndFocus();
          }
        }}
        helperText={tooShort ? copy.minLengthHint : undefined}
        fullWidth
        inputRef={input}
        slotProps={{
          htmlInput: { enterKeyHint: "search" },
          input: {
            endAdornment: (
              <>
                {loading && <CircularProgress size={16} aria-label={copy.loading} />}
                {text !== "" && (
                  <IconButton aria-label={copy.clear} size="small" onClick={clearAndFocus} edge="end">
                    ×
                  </IconButton>
                )}
              </>
            ),
          },
        }}
      />
    </Box>
  );
}
