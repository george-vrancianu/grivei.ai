import type { Decorator } from "@storybook/react-vite";
import { Card } from "../atoms/Card/index.ts";


/** Draws a story on the panel colour with the theme's panel treatment (border, radius, shadow): the ground a map sits on in the main screen and the entity page. */
export const onPanel: Decorator = (Story) => (
  <Card sx={{ p: 2 }}>
    <Story />
  </Card>
);
