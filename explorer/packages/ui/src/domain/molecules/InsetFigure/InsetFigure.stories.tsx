import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../../../atoms/Card/index.ts";
import { pick } from "../../../workbench/index.ts";
import { InsetFigure } from "./index.ts";

const meta = { title: "Domain/InsetFigure", component: InsetFigure } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** A count in a well on a panel. */
export const Count: Story = {
  render: (_args, { globals }) => (
    <Card sx={{ p: 2, maxWidth: 320 }}>
      <InsetFigure label={pick(globals["locale"], { en: "Records", ro: "Înregistrări" })}>
        {pick(globals["locale"], { en: "2,558", ro: "2.558" })}
      </InsetFigure>
    </Card>
  ),
};

/** The suspect Records: the whole figure is the link. */
export const AsLink: Story = {
  render: (_args, { globals }) => (
    <Card sx={{ p: 2, maxWidth: 320 }}>
      <InsetFigure href="/explore/?badges=suspect-value&tab=records" label={pick(globals["locale"], { en: "Suspect values left out", ro: "Valori suspecte excluse" })}>
        3
      </InsetFigure>
    </Card>
  ),
};

/** A long label and a very large amount wrap inside the well instead of widening it. */
export const LongValue: Story = {
  render: (_args, { globals }) => (
    <Card sx={{ p: 2, maxWidth: 240 }}>
      <InsetFigure label={pick(globals["locale"], { en: "Framework ceilings not counted", ro: "Plafoane de acorduri-cadru neincluse" })}>
        {pick(globals["locale"], { en: "RON 90,071,992,547,409,930", ro: "90.071.992.547.409.930 RON" })}
      </InsetFigure>
    </Card>
  ),
};
