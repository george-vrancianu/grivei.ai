import { useId, useRef } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { CircularProgress } from "../../../atoms/CircularProgress/index.ts";
import { IconButton } from "../../../atoms/IconButton/index.ts";
import { TextField } from "../../../atoms/TextField/index.ts";
import { size, type } from "../../../theme/tokens.ts";
import { useDebouncedQuery } from "./hooks/useDebouncedQuery.ts";
import type { SearchBarCopy } from "./searchBar.types.ts";
import { DEFAULT_DEBOUNCE_MS, DEFAULT_MIN_LENGTH, isTooShort } from "./searchBar.utils.ts";

export type { SearchBarCopy } from "./searchBar.types.ts";

export interface SearchBarProps {
  /** The id of an element that describes the field (the Source eyebrow); it is added to the field's `aria-describedby` after the hint. */
  describedBy?: string;
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

/** The magnifier at the start of the field: decorative, so hidden from assistive technology. */
function SearchIcon() {
  return (
    <Box component="svg" aria-hidden="true" viewBox="0 0 24 24" width={20} height={20} sx={{ mr: 1.5, flex: "none", color: "text.secondary" }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5 21 21" />
    </Box>
  );
}

/** The free-text search box. Presentational: it emits the query; the page fetches. */
export function SearchBar({ value, onQueryChange, describedBy, loading = false, debounceMs = DEFAULT_DEBOUNCE_MS, minLength = DEFAULT_MIN_LENGTH, copy }: SearchBarProps) {
  const { text, setText, clear } = useDebouncedQuery({ value, onQueryChange, debounceMs, minLength });
  const input = useRef<HTMLInputElement>(null);
  const clearAndFocus = () => {
    clear();
    input.current?.focus();
  };
  const tooShort = isTooShort(text, minLength);
  const id = useId();
  const helperId = `${id}-helper`;
  return (
    <Box role="search" aria-busy={loading}>
      <TextField
        type="search"
        id={id}
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
        helperText={tooShort ? copy.minLengthHint : copy.hint}
        fullWidth
        sx={{ "& .MuiOutlinedInput-root": { minHeight: size.searchInput, fontSize: type.search.size, pl: 2.25 }, "& .MuiFormHelperText-root": { mx: 0, color: "text.secondary" } }}
        inputRef={input}
        slotProps={{
          htmlInput: { enterKeyHint: "search", "aria-describedby": describedBy ? `${helperId} ${describedBy}` : helperId },
          formHelperText: { id: helperId },
          input: {
            startAdornment: <SearchIcon />,
            endAdornment: (
              <>
                {loading && <CircularProgress size={16} aria-label={copy.loading} />}
                {text !== "" && (
                  <IconButton aria-label={copy.clear} size="small" onClick={clearAndFocus} edge="end">
                    <span aria-hidden="true">×</span>
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
