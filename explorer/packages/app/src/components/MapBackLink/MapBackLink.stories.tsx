import type { Meta, StoryObj } from "@storybook/react-vite";
import { catalogue } from "../../copy/index.ts";
import { MapBackLink } from "./index.ts";

const meta = { title: "App/MapBackLink", component: MapBackLink } satisfies Meta<typeof MapBackLink>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: catalogue.en.zoomedCounty.back, onClick: () => undefined },
  render: (args, { globals }) => <MapBackLink {...args}>{catalogue[globals["locale"] === "ro" ? "ro" : "en"].zoomedCounty.back}</MapBackLink>,
};
