import type { Meta, StoryObj } from "@storybook/react-vite";
import { fixtures } from "@grivei/contract/fixtures";
import { catalogue } from "../../copy/index.ts";
import { MainTotal } from "./index.ts";

const meta = { title: "App/MainTotal", component: MainTotal } satisfies Meta<typeof MainTotal>;
export default meta;
type Story = StoryObj<typeof meta>;

const national = fixtures.MainScreen.find((f) => f.name === "empty-filter-national")!.data;
const sources = [{ id: "SEAP" as const, name: "SEAP", harvested: true, dataThrough: [{ kind: "CONTRACT", date: "2024-09-30" }] }];

export const National: Story = {
  // copy and locale follow the toolbar's language in `render`; the args only satisfy the types
  args: { total: national.seap.search.total, sources, copy: { heading: catalogue.en.main.total, total: catalogue.en.total, dataThrough: catalogue.en.dataThrough, kinds: catalogue.en.coverage.grid.kinds }, locale: "en", methodologyHref: "/explore/methodology#awarded-value", suspectHref: "/explore/?badges=suspect-value&tab=records" },
  render: (args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    const t = catalogue[locale];
    return <MainTotal {...args} locale={locale} copy={{ heading: t.main.total, total: t.total, dataThrough: t.dataThrough, kinds: t.coverage.grid.kinds }} />;
  },
};
