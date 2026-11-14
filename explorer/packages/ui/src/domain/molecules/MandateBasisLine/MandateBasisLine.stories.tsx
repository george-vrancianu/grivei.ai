import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../samples/copy.ts";
import { mandateBasisCopy } from "../../samples/leadership.ts";
import { MandateBasisLine } from "./index.ts";

const meta = { title: "Domain/MandateBasisLine", component: MandateBasisLine } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const line = (mandate: Parameters<typeof MandateBasisLine>[0]["mandate"]): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <MandateBasisLine mandate={mandate} locale={locale} copy={mandateBasisCopy[locale]} />;
  },
});
const base = { independent: false, memberParties: [] as string[], basis: "FINAL_MINUTES" as const, electionDate: "2024-06-09", dataThrough: "2024-06-09" };

export const FinalMinutes = line(base);
export const Independent = line({ ...base, independent: true });
export const Alliance = line({ ...base, memberParties: ["PARTIDUL USR", "PARTIDUL LIBERTATE UNITATE SI SOLIDARITATE"] });
export const RepeatRound = line({ ...base, basis: "REPEAT_ROUND", electionDate: "2020-10-11" });
export const PartialElection = line({ ...base, basis: "PARTIAL_MINUTES", electionDate: "2025-12-07", dataThrough: "2025-12-09" });
