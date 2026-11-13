import { Box } from "../../../../../atoms/Box/index.ts";
import { Button } from "../../../../../atoms/Button/index.ts";
import { CiteLine, type CiteLineCopy } from "../../../../molecules/CiteLine/index.ts";
import type { RecordPageData } from "../../../../types.ts";

export interface RecordActionsCopy {
  /** "Check in SEAP", given the Source's id. */
  checkIn: (source: string) => string;
  cite: CiteLineCopy;
}

export interface RecordActionsProps {
  provenance: RecordPageData["provenance"];
  /** The Record's citable URL, scheme included. */
  citeUrl: string;
  copy: RecordActionsCopy;
}

/** Under the title: the primary "Check in SEAP" button (only when the Source has a page for this Record) and the citable URL with its copy button. */
export function RecordActions({ provenance, citeUrl, copy }: RecordActionsProps) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
      {provenance.url && (
        <Button variant="contained" color="primary" href={provenance.url} target="_blank" rel="noopener noreferrer">
          {copy.checkIn(provenance.source)}
          <Box component="span" aria-hidden="true" sx={{ ml: 1 }}>
            ↗
          </Box>
        </Button>
      )}
      <Box sx={{ flex: "1 1 18rem", minWidth: 0 }}>
        <CiteLine url={citeUrl} copy={copy.cite} />
      </Box>
    </Box>
  );
}
