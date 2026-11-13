import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { SignalCountChip } from "./index.ts";

const meta = { title: "Domain/SignalCountChip", component: SignalCountChip } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const chips = (counts: number[], locale: "en" | "ro") => (
  <Stack direction="row" spacing={1}>
    {counts.map((n) => (
      <SignalCountChip key={n} count={n} href="/explore/supplier/2000007#signals" entityName="Alfa Construct SRL" locale={locale} copy={sampleCopy.signalCount(locale)} />
    ))}
  </Stack>
);

/** One Signal, a few, and the Romanian "de" forms from 20 (plus a thousands separator). */
export const Counts: Story = { render: (_a, { globals }) => chips([1, 2, 19, 20, 1200], localeOf(globals["locale"])) };
