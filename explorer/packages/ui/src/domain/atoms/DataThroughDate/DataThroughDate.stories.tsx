import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { dataThroughSeap } from "../../samples/fixtureData.ts";
import { DataThroughDate } from "./index.ts";

const meta = { title: "Domain/DataThroughDate", component: DataThroughDate } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const Typical: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <DataThroughDate dataThrough={dataThroughSeap[0]!} locale={locale} copy={sampleCopy.dataThrough(locale)} />;
  },
};
/** Every record kind of the SEAP Source, one per line. */
export const EveryKind: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <Stack>
        {dataThroughSeap.map((entry) => (
          <DataThroughDate key={entry.kind} dataThrough={entry} locale={locale} copy={sampleCopy.dataThrough(locale)} />
        ))}
      </Stack>
    );
  },
};
export const WithKindLabel: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <DataThroughDate
        dataThrough={dataThroughSeap[0]!}
        locale={locale}
        copy={sampleCopy.dataThrough(locale)}
        kindLabel={locale === "ro" ? "Achiziții directe" : "Direct purchases"}
      />
    );
  },
};
export const SingleDigitDay: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <DataThroughDate dataThrough={{ kind: "CONTRACT", date: "2024-03-02" }} locale={locale} copy={sampleCopy.dataThrough(locale)} />;
  },
};
