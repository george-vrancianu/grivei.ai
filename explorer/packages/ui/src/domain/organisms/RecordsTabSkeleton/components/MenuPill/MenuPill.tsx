import { Box } from "../../../../../atoms/Box/index.ts";
import { Skeleton } from "../../../../../atoms/Skeleton/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { color, radius, size } from "../../../../../theme/tokens.ts";

/** A filter menu before it has its values: its real name over a block, in the size of the menu button it becomes. */
export function MenuPill({ label }: { label: string }) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, height: size.primaryAction, px: 1.75, border: 1, borderColor: color.line, borderRadius: `${radius.menuButton}px` }}>
      <Typography variant="meta" component="span">
        {label}
      </Typography>
      <Skeleton aria-hidden="true" variant="rounded" width={36} height={12} />
    </Box>
  );
}
