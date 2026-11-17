import { useId } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Button } from "../../../atoms/Button/index.ts";
import { Card } from "../../../atoms/Card/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { color, font, layout, type } from "../../../theme/tokens.ts";
import { followLink } from "../../utils/followLink.ts";
import { pageSx } from "../../utils/pageSx.ts";

export interface NotFoundAction {
  label: string;
  href: string;
}

export interface NotFoundPanelProps {
  /** The page's heading (h1): what was not found. */
  title: string;
  /** One sentence: what to do about it. */
  body: string;
  /** The way back to the main screen: the accent button. */
  primary: NotFoundAction;
  /** A plain click on the action goes here instead of loading the page. */
  onNavigate?: ((href: string) => void) | undefined;
}

/**
 * The page's `main` (760 px wide) holding the one not-found panel (#260): "404" in mono `muted`, the title, a sentence and the way back.
 * The unknown address, an entity, a person and a Record that are not there all use it, each with its own title and sentence.
 * A card, not a titled `Panel`: there is no header strip.
 */
export function NotFoundPanel({ title, body, primary, onNavigate }: NotFoundPanelProps) {
  const headingId = useId();
  return (
    <Stack component="main" sx={{ ...pageSx, maxWidth: layout.notFoundMaxWidth, pt: 6 }}>
      <Card component="section" aria-labelledby={headingId} sx={{ p: 4 }}>
        <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
          <Typography component="span" variant="label" sx={{ color: color.muted, fontFamily: font.mono }}>
            404
          </Typography>
          <Typography id={headingId} variant="h1" component="h1">
            {title}
          </Typography>
          <Typography sx={{ color: color.text2, fontSize: type.bodyLong.size, lineHeight: type.bodyLong.lineHeight }}>{body}</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <Button variant="contained" href={primary.href} onClick={followLink(primary.href, onNavigate)}>
              {primary.label}
            </Button>
          </Box>
        </Stack>
      </Card>
    </Stack>
  );
}
