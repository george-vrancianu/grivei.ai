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

/** The optional third line: what the figure rests on. */
export const WithNote: Story = {
  render: (_args, { globals }) => (
    <Card sx={{ p: 2, maxWidth: 320 }}>
      <InsetFigure
        label={pick(globals["locale"], { en: "Base rate", ro: "Rată de bază" })}
        note={pick(globals["locale"], { en: "over the last 12 months", ro: "în ultimele 12 luni" })}
      >
        {pick(globals["locale"], { en: "4.2%", ro: "4,2%" })}
      </InsetFigure>
    </Card>
  ),
};

/** With a link the note is part of it, read after the value. */
export const AsLinkWithNote: Story = {
  render: (_args, { globals }) => (
    <Card sx={{ p: 2, maxWidth: 320 }}>
      <InsetFigure
        href="/explore/?badges=suspect-value&tab=records"
        label={pick(globals["locale"], { en: "Suspect values left out", ro: "Valori suspecte excluse" })}
        note={pick(globals["locale"], { en: "not in the Total", ro: "nu sunt în Total" })}
      >
        3
      </InsetFigure>
    </Card>
  ),
};

/** A long note wraps inside the well. */
export const LongNote: Story = {
  render: (_args, { globals }) => (
    <Card sx={{ p: 2, maxWidth: 240 }}>
      <InsetFigure
        label={pick(globals["locale"], { en: "Framework ceilings", ro: "Plafoane de acorduri-cadru" })}
        note={pick(globals["locale"], { en: "ceilings are not summed into the Total, only the contracts under them", ro: "plafoanele nu se adună în Total, doar contractele din cadrul lor" })}
      >
        {pick(globals["locale"], { en: "RON 1,200,000,000", ro: "1.200.000.000 RON" })}
      </InsetFigure>
    </Card>
  ),
};
