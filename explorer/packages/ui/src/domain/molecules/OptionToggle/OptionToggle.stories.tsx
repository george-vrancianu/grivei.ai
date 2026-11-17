import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { pick } from "../../../workbench/index.ts";
import { OptionToggle } from "./index.ts";

const meta = { title: "Domain/OptionToggle", component: OptionToggle } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const OPTIONS = ["money", "coverage", "other"] as const;
type Option = (typeof OPTIONS)[number];

function Demo({ locale }: { locale: unknown }) {
  const [value, setValue] = useState<Option>("money");
  const labels = pick(locale, {
    en: { money: "Money", coverage: "Coverage", other: "Other" },
    ro: { money: "Bani", coverage: "Acoperire", other: "Altele" },
  });
  return <OptionToggle options={OPTIONS} value={value} onChange={setValue} labels={labels} label={pick(locale, { en: "Choose one", ro: "Alege una" })} />;
}

/** Pick a choice; the pressed button follows. */
export const ThreeOptions: Story = { render: (_args, { globals }) => <Demo locale={globals["locale"]} /> };

function Fixed({ locale, value }: { locale: unknown; value: Option }) {
  const labels = pick(locale, {
    en: { money: "Money", coverage: "Coverage", other: "Other" },
    ro: { money: "Bani", coverage: "Acoperire", other: "Altele" },
  });
  return <OptionToggle options={OPTIONS} value={value} onChange={() => {}} labels={labels} label={pick(locale, { en: "Choose one", ro: "Alege una" })} />;
}

/** The first option chosen: the selected state is the line fill with the inset accent outline, on the well track. */
export const FirstSelected: Story = { render: (_args, { globals }) => <Fixed locale={globals["locale"]} value="money" /> };
/** The middle option chosen. */
export const MiddleSelected: Story = { render: (_args, { globals }) => <Fixed locale={globals["locale"]} value="coverage" /> };
/** The last option chosen. */
export const LastSelected: Story = { render: (_args, { globals }) => <Fixed locale={globals["locale"]} value="other" /> };
