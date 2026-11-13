import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { CiteLine } from "./index.ts";

const meta = { title: "Domain/CiteLine", component: CiteLine } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The full-results view's bar: the label, the address of the view (query included) and the copy button. */
export const Framed: Story = {
  render: (_args, { globals }) => (
    <CiteLine framed url="https://grivei.ai/explore/search?q=strazi&tab=records&order=value&page=1" copy={sampleCopy.citeThisView(localeOf(globals["locale"]))} />
  ),
};
/** Beside a Record's title: the address and the button, the label for screen readers only. */
export const Unframed: Story = {
  render: (_args, { globals }) => <CiteLine url="https://grivei.ai/explore/record/CAN1145000" copy={sampleCopy.recordDetail(localeOf(globals["locale"])).cite} />,
};
/** A long address wraps instead of widening the page (resize the canvas to 390 px). */
export const LongAddress: Story = {
  render: (_args, { globals }) => (
    <CiteLine
      framed
      url="https://grivei.ai/explore/search?q=lucrari%20de%20intretinere%20si%20reparatii&tab=records&from=2021-01-01&to=2026-12-31&order=value&page=12"
      copy={sampleCopy.citeThisView(localeOf(globals["locale"]))}
    />
  ),
};
