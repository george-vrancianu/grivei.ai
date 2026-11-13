import type { Meta, StoryObj } from "@storybook/react-vite";
import { catalogue } from "../../../../copy/index.ts";
import { Footer } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/AppShell/Footer" };
export default meta;

/** Where the data comes from, and that Signals are counted, never scored. */
export const Default: StoryObj = {
  render: (_args, { globals }) => <Footer copy={catalogue[globals["locale"] === "ro" ? "ro" : "en"].footer} />,
};
