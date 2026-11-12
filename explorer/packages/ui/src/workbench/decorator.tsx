import type { Decorator } from "@storybook/react-vite";
import { UiProvider } from "../UiProvider/index.ts";
import { LOCALES } from "../theme/index.ts";

/** Storybook `globalTypes` entry: the EN/RO switch in the toolbar. */
export const localeGlobalType = {
  description: "Language of the story (EN default, RO)",
  toolbar: {
    title: "Language",
    icon: "globe",
    dynamicTitle: true,
    items: LOCALES.map((value) => ({ value, title: value.toUpperCase() })),
  },
} as const;

/** Wraps every story in the UI provider with the toolbar's `locale` global. */
export const withLocale: Decorator = (Story, { globals }) => (
  <UiProvider locale={globals["locale"] === "ro" ? "ro" : "en"}>
    <Story />
  </UiProvider>
);
