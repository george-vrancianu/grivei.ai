import type { Preview } from "@storybook/react-vite";
import { localeGlobalType, withLocale } from "@grivei/ui/workbench";

const preview: Preview = {
  decorators: [withLocale],
  globalTypes: { locale: localeGlobalType },
  initialGlobals: { locale: "en" },
  parameters: { layout: "padded", controls: { expanded: true } },
};

export default preview;
