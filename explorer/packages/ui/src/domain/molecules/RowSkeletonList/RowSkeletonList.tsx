import { Box } from "../../../atoms/Box/index.ts";
import { listSx } from "../../utils/listSx.ts";
import { RowSkeleton } from "./components/RowSkeleton/index.ts";
import { ROW_COUNT, ROW_SHAPES, rowOpacity } from "../../utils/resultsSkeleton.ts";

/** Eight placeholder entity rows (a name over a meta line, a chip, an amount) fading down the list, `aria-hidden`: what a results panel shows on first load, in the rows' place. */
export function RowSkeletonList() {
  return (
    <Box component="ul" aria-hidden="true" sx={listSx}>
      {ROW_SHAPES.slice(0, ROW_COUNT).map((shape, index) => (
        <RowSkeleton key={index} shape={shape} opacity={rowOpacity(index)} />
      ))}
    </Box>
  );
}
