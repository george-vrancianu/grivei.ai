import type { Decorator } from "@storybook/react-vite";
import { Box } from "../atoms/Box/index.ts";
import { color, radius } from "../theme/tokens.ts";

/** Draws a story on the panel colour with a line border: the ground a map sits on in the main screen and the entity page. */
export const onPanel: Decorator = (Story) => (
  <Box sx={{ p: 2, bgcolor: color.panel, border: `1px solid ${color.line}`, borderRadius: `${radius.card}px` }}>
    <Story />
  </Box>
);
