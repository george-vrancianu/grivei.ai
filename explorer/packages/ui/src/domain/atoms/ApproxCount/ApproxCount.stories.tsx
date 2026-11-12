import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { localeOf } from "../../samples/copy.ts";
import { authoritiesEstimated, authoritiesExact, suppliersEstimated } from "../../samples/fixtureData.ts";
import { ApproxCount } from "./index.ts";

const meta = { title: "Domain/ApproxCount", component: ApproxCount, args: { count: authoritiesExact.count, estimated: authoritiesExact.countEstimated, locale: "en" } } satisfies Meta<typeof ApproxCount>;
export default meta;
type Story = StoryObj<typeof meta>;

const render: Story["render"] = (args, { globals }) => <ApproxCount {...args} locale={localeOf(globals["locale"])} />;

export const Exact: Story = { render };
export const Estimated: Story = { args: { count: authoritiesEstimated.count, estimated: authoritiesEstimated.countEstimated }, render };
export const Zero: Story = { args: { count: 0, estimated: false }, render };
export const Large: Story = { args: { count: suppliersEstimated.count * 1000, estimated: true }, render };
export const Both: Story = {
  render: (_args, { globals }) => (
    <Stack>
      <ApproxCount count={authoritiesExact.count} estimated={false} locale={localeOf(globals["locale"])} />
      <ApproxCount count={suppliersEstimated.count} estimated locale={localeOf(globals["locale"])} />
    </Stack>
  ),
};
