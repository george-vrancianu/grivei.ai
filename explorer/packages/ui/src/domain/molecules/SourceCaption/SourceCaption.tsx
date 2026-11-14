import { Link } from "../../../atoms/Link/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";

export interface SourceCaptionProps {
  /** The sentence, already formatted ("Source: ONRC, snapshot of 6 May 2026"). */
  label: string;
  /** The source's address; without one the label is plain text. */
  url: string | null;
}

/** A small caption naming the source of what stands above it, linking to the source when it has an address. */
export function SourceCaption({ label, url }: SourceCaptionProps) {
  return (
    <Typography variant="caption" color="text.secondary">
      {url ? (
        <Link href={url} target="_blank">
          {label}
        </Link>
      ) : (
        label
      )}
    </Typography>
  );
}
