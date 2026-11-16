import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { Fact } from "./index.ts";

const meta = { title: "Domain/Fact", component: Fact } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** A caption over a value. */
export const Typical: Story = {
  render: (_args, { globals }) => <Fact label={pick(globals["locale"], { en: "Registered", ro: "Înregistrată" })}>{pick(globals["locale"], { en: "14 March 2002", ro: "14 martie 2002" })}</Fact>,
};
