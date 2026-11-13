import type { Meta, StoryObj } from "@storybook/react-vite";
import { catalogue } from "../../copy/index.ts";
import { MainDataThrough } from "./index.ts";

const meta = { title: "App/MainDataThrough", component: MainDataThrough } satisfies Meta<typeof MainDataThrough>;
export default meta;
type Story = StoryObj<typeof meta>;

const sources = [
  {
    id: "SEAP" as const, name: "SEAP", harvested: true,
    dataThrough: [{ kind: "DA", date: "2024-09-30" }, { kind: "CONTRACT", date: "2024-11-11" }],
  },
];

export const Typical: Story = {
  // copy and locale follow the toolbar's language in `render`; the args only satisfy the types
  args: { sources, copy: { dataThrough: catalogue.en.dataThrough, kinds: catalogue.en.coverage.grid.kinds }, locale: "en" },
  render: (args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    const t = catalogue[locale];
    return <MainDataThrough {...args} locale={locale} copy={{ dataThrough: t.dataThrough, kinds: t.coverage.grid.kinds }} />;
  },
};
