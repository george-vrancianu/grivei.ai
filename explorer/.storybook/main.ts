import type { StorybookConfig } from "@storybook/react-vite";

// One workbench for the UI library and the app. A glob that matches nothing is fine:
// packages/app joins automatically once it has stories.
const config: StorybookConfig = {
  stories: ["../packages/ui/src/**/*.stories.@(ts|tsx)", "../packages/app/src/**/*.stories.@(ts|tsx)"],
  framework: "@storybook/react-vite",
  core: { disableTelemetry: true },
  typescript: { reactDocgen: "react-docgen" },
};

export default config;
