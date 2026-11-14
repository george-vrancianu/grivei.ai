import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { onrcRegistration, onrcRegistrationSparse } from "../../samples/onrc.ts";
import type { OnrcRegistrationData } from "../../types.ts";
import { OnrcSection } from "./index.ts";

const meta = { title: "Domain/OnrcSection", component: OnrcSection } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const story =
  (registration: OnrcRegistrationData, onrcOnly: boolean): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <OnrcSection registration={registration} onrcOnly={onrcOnly} locale={locale} copy={sampleCopy.onrcSection(locale)} />;
  };

/** A supplier: a status change with its first-seen date, a status "since at least" the earliest snapshot, CAEN codes, a rename. */
export const Typical: Story = { render: story(onrcRegistration, false) };
/** An organisation that exists only in ONRC: the note says no person of it is shown. */
export const OnrcOnly: Story = { render: story(onrcRegistration, true) };
/** Legacy layout: no registration date, no CAEN codes, no seat, an unnamed status code, no link to the dataset. */
export const Sparse: Story = { render: story(onrcRegistrationSparse, true) };
