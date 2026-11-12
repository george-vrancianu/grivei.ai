import type { Meta, StoryObj } from "@storybook/react-vite";
import { catalogue } from "../../copy/index.ts";
import { AppLink } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/AppLink" };
export default meta;

export const Internal: StoryObj = {
  // the label follows the toolbar's language
  render: (_args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    return <AppLink href="/explore/coverage">{catalogue[locale].nav.coverage}</AppLink>;
  },
};
