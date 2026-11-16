import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { Tag } from "./index.ts";

const meta = { title: "Domain/Tag", component: Tag } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** An attribute of the row it sits on. */
export const Short: Story = { render: (_a, { globals }) => <Tag>{pick(globals["locale"], { en: "SEAP counterparty", ro: "Parte în SEAP" })}</Tag> };

/** A long label wraps inside its box. */
export const Long: Story = {
  render: (_a, { globals }) => (
    <div style={{ maxWidth: 160 }}>
      <Tag>{pick(globals["locale"], { en: "Dissolved after a merger by absorption", ro: "Dizolvată în urma unei fuziuni prin absorbție" })}</Tag>
    </div>
  ),
};
