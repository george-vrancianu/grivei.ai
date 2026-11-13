import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { GapRule } from "../../../../types.ts";
import { GAP_STATES } from "../../../../utils/coverageGrid.ts";
import { followLink } from "../../../../utils/followLink.ts";
import type { CoveragePageLayoutCopy } from "../../coveragePageLayout.types.ts";

export interface GapRulesProps {
  /** Where the methodology page lives. */
  methodologyHref: string;
  onNavigate?: ((href: string) => void) | undefined;
  copy: CoveragePageLayoutCopy;
}

const RULES: readonly GapRule[] = ["HAND_ENTERED", "COUNT_BELOW_NEIGHBOURS", "NO_PRIOR_CALL_BEFORE_BACKFILL", "AWAITING_BULK_FILE"];

/** The published rules in words, what each state means, and the link to the methodology. */
export function GapRules({ methodologyHref, onNavigate, copy }: GapRulesProps) {
  const { rules, grid } = copy;
  return (
    <>
      <Typography variant="body2" color="text.secondary" gutterBottom>{rules.intro}</Typography>
      <Box component="dl" sx={{ m: 0 }}>
        {RULES.map((rule) => (
          <Box key={rule} data-rule={rule} sx={{ mb: 1 }}>
            <Typography component="dt" variant="subtitle1">{rules.names[rule]}</Typography>
            <Typography component="dd" sx={{ m: 0 }}>{grid.rules[rule]}</Typography>
          </Box>
        ))}
      </Box>
      <Typography variant="subtitle1" component="h3" gutterBottom sx={{ mt: 1 }}>{rules.statesHeading}</Typography>
      <Box component="dl" sx={{ m: 0 }}>
        {GAP_STATES.map((state) => (
          <Box key={state} data-state-meaning={state} sx={{ mb: 1 }}>
            <Typography component="dt" variant="subtitle1">{grid.states[state]}</Typography>
            <Typography component="dd" sx={{ m: 0 }}>{rules.states[state]}</Typography>
          </Box>
        ))}
      </Box>
      <Link href={methodologyHref} onClick={followLink(methodologyHref, onNavigate)}>{rules.methodology}</Link>
    </>
  );
}
