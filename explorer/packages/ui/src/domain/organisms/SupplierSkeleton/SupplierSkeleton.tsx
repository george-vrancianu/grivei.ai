import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { InsetFigure } from "../../molecules/InsetFigure/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { PanelPair } from "../../molecules/PanelPair/index.ts";
import { skeletonBlock } from "../../utils/skeletonBlock.tsx";
import type { OnrcSectionCopy } from "../OnrcSection/index.ts";
import type { PeopleSectionCopy } from "../PeopleSection/index.ts";

export interface SupplierSkeletonProps {
  /** The ONRC section's own copy: its title and the figures' labels are the real ones. */
  onrc: Pick<OnrcSectionCopy, "heading" | "registrationNumber" | "registrationDate" | "legalForm">;
  /** The People section's own copy: its title is the real one. */
  people: Pick<PeopleSectionCopy, "heading">;
}

/**
 * The ONRC and People panels of a supplier's Overview on first load: the two-column row with a block where each value goes and the real titles and figure labels. The whole row is
 * `aria-hidden` (the page's loading status is what a screen reader hears). Financial statements, firm donations and public enterprise may be absent, so they are not drawn.
 */
export function SupplierSkeleton({ onrc, people }: SupplierSkeletonProps) {
  return (
    <Box aria-hidden="true">
      <PanelPair
        wide={
          <Panel heading={onrc.heading} level="h2">
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              <InsetFigure label={onrc.registrationNumber}>{skeletonBlock(120, 22)}</InsetFigure>
              <InsetFigure label={onrc.registrationDate}>{skeletonBlock(120, 22)}</InsetFigure>
              <InsetFigure label={onrc.legalForm}>{skeletonBlock(48, 22)}</InsetFigure>
            </Box>
            {skeletonBlock("100%", 20)}
            {skeletonBlock("100%", 72)}
          </Panel>
        }
        narrow={
          <Panel heading={people.heading} level="h2" flush>
            <Stack component="div">
              {[0, 1, 2].map((row) => (
                <Box key={row} sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 1.5, px: 2, "& + &": { borderTop: 1, borderColor: "divider" } }}>
                  {skeletonBlock("50%", 20)}
                  {skeletonBlock(72, 20)}
                </Box>
              ))}
            </Stack>
          </Panel>
        }
      />
    </Box>
  );
}
