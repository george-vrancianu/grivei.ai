import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { localeOf } from "../../samples/copy.ts";
import { formatPercent } from "../../utils/formatPercent.ts";
import { ShareBar } from "./index.ts";

const meta = { title: "Domain/ShareBar", component: ShareBar } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The same bar at 100%, 18.8%, 2.5% and with no share to tell (a zero total), each with the percentage the reader sees beside it. */
export const Shares: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <Stack spacing={1.5} sx={{ maxWidth: 360 }}>
        {[1, 0.188, 0.025, null].map((share) => (
          <Stack key={String(share)} spacing={0.5}>
            <Typography variant="label" component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {share === null ? "–" : formatPercent(share, locale)}
            </Typography>
            <ShareBar share={share} />
          </Stack>
        ))}
      </Stack>
    );
  },
};
