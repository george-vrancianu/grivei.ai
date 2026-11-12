import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { frameworkOverrunSignal, manySuppliersSignal, noPublicationSignal, overCapSignal, splittingSignal } from "../../samples/signals.ts";
import type { SignalData } from "../../types.ts";
import { SignalBadge } from "./index.ts";

const meta = { title: "Domain/SignalBadge", component: SignalBadge } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const badges =
  (...signals: SignalData[]): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {signals.map((signal) => (
          <SignalBadge
            key={`${signal.rule}-${signal.date}`}
            signal={signal}
            href={`/explore/authority/${signal.reproduce.authority}/records?signal=${signal.rule.toLowerCase().replaceAll("_", "-")}`}
            locale={locale}
            copy={sampleCopy.signalCard(locale)}
          />
        ))}
      </Stack>
    );
  };

/** The compact form of each rule: label and date, the sentence on hover or focus, a link to the Signal's Records. */
export const OverCap: Story = { render: badges(overCapSignal) };
export const Splitting: Story = { render: badges(splittingSignal) };
export const FrameworkOverrun: Story = { render: badges(frameworkOverrunSignal) };
export const NoPublication: Story = { render: badges(noPublicationSignal) };
/** Several Signals on one Record row, side by side. */
export const AllRules: Story = { render: badges(overCapSignal, splittingSignal, frameworkOverrunSignal, noPublicationSignal, manySuppliersSignal) };
