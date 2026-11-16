import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { GapRule } from "../../../../types.ts";
import { GAP_STATES } from "../../../../utils/coverageGrid.ts";
import { listRowSx } from "../../../../utils/listSx.ts";
import { followLink } from "../../../../utils/followLink.ts";
import type { CoveragePageLayoutCopy } from "../../coveragePageLayout.types.ts";

export interface GapRulesProps {
  /** Where the methodology page lives. */
  methodologyHref: string;
  onNavigate?: ((href: string) => void) | undefined;
  copy: CoveragePageLayoutCopy;
}

const RULES: readonly GapRule[] = ["HAND_ENTERED", "COUNT_BELOW_NEIGHBOURS", "NO_PRIOR_CALL_BEFORE_BACKFILL", "AWAITING_BULK_FILE"];

const rowsSx = { m: 0, borderTop: 1, borderColor: "divider", "& > div + div": { borderTop: 1, borderColor: "divider" } } as const;

/** The body of the "How gaps are decided" panel (flush): the intro, the rules in words and what each state means as rows, and the link to the methodology. */
export function GapRules({ methodologyHref, onNavigate, copy }: GapRulesProps) {
  const { rules, grid } = copy;
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ m: 0, p: 2, pb: 1.5 }}>{rules.intro}</Typography>
      <Box component="dl" sx={rowsSx}>
        {RULES.map((rule) => (
          <Box key={rule} data-rule={rule} sx={listRowSx}>
            <Typography component="dt" variant="subtitle1">{rules.names[rule]}</Typography>
            <Typography component="dd" sx={{ m: 0 }}>{grid.rules[rule]}</Typography>
          </Box>
        ))}
      </Box>
      <Typography variant="subtitle1" component="h3" sx={{ m: 0, px: 2, py: 1.5, borderTop: 1, borderColor: "divider" }}>{rules.statesHeading}</Typography>
      <Box component="dl" sx={rowsSx}>
        {GAP_STATES.map((state) => (
          <Box key={state} data-state-meaning={state} sx={listRowSx}>
            <Typography component="dt" variant="subtitle1">{grid.states[state]}</Typography>
            <Typography component="dd" sx={{ m: 0 }}>{rules.states[state]}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Link href={methodologyHref} onClick={followLink(methodologyHref, onNavigate)}>{rules.methodology}</Link>
      </Box>
    </>
  );
}
