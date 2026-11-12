import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { frameworkOverrunSignal, manySuppliersSignal, noPublicationSignal, overCapSignal, splittingSignal } from "../../samples/signals.ts";
import type { SignalData } from "../../types.ts";
import { SignalCard } from "./index.ts";

const meta = { title: "Domain/SignalCard", component: SignalCard } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const card =
  (signal: SignalData, seapHref: string | null = null): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <SignalCard
        signal={signal}
        reproduceHref={`/explore/authority/${signal.reproduce.authority}/records?signal=${signal.rule.toLowerCase().replaceAll("_", "-")}`}
        methodologyHref={`/explore/methodology#signal-${signal.rule.toLowerCase().replaceAll("_", "-")}`}
        seapHref={seapHref}
        entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
        locale={locale}
        copy={sampleCopy.signalCard(locale)}
      />
    );
  };

/** One direct purchase above the cap; one Record, so "Check in SEAP" links to it. */
export const OverCap: Story = { render: card(overCapSignal, "/source/seap/DA12345678") };
/** Two purchases in one CPV group within the window; several Records, so the card says to check each in SEAP. */
export const Splitting: Story = { render: card(splittingSignal) };
/** Thirteen Records under one framework agreement; a ratio, not a verdict. */
export const FrameworkOverrun: Story = { render: card(frameworkOverrunSignal) };
/** A procedure without prior publication, the procedure name as SEAP publishes it. */
export const NoPublication: Story = { render: card(noPublicationSignal, "/source/seap/DA12399999") };
/** Eleven suppliers and a long procedure name: five are named, the rest are counted. */
export const ManySuppliersLongNames: Story = { render: card(manySuppliersSignal) };
