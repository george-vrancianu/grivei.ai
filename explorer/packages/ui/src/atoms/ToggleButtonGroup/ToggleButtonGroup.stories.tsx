import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { pick } from "../../workbench/index.ts";
import { ToggleButton } from "../ToggleButton/index.ts";
import { ToggleButtonGroup, type ToggleButtonGroupProps } from "./index.ts";

const meta = { title: "Atoms/ToggleButtonGroup", component: ToggleButtonGroup } satisfies Meta<typeof ToggleButtonGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

function LensToggle({ locale, ...args }: ToggleButtonGroupProps & { locale: unknown }) {
  const [value, setValue] = useState("money");
  return (
    <ToggleButtonGroup
      {...args}
      exclusive
      aria-label={pick(locale, { en: "Lens", ro: "Perspectivă" })}
      value={value}
      onChange={(_event, next: string | null) => next && setValue(next)}
    >
      <ToggleButton value="money">{pick(locale, { en: "Money", ro: "Bani" })}</ToggleButton>
      <ToggleButton value="coverage">{pick(locale, { en: "Coverage", ro: "Acoperire" })}</ToggleButton>
      <ToggleButton value="flow" disabled>
        {pick(locale, { en: "Flow", ro: "Flux" })}
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

export const Lens: Story = { render: (args, { globals }) => <LensToggle {...args} locale={globals["locale"]} /> };
