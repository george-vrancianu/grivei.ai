import type { Meta, StoryObj } from "@storybook/react-vite";
import { fixtures } from "@grivei/contract/fixtures";
import { copy } from "../../copy.ts";
import { TotalSummary } from "./index.ts";

const meta = { title: "App/TotalSummary", component: TotalSummary } satisfies Meta<typeof TotalSummary>;
export default meta;
type Story = StoryObj<typeof meta>;

const national = fixtures.MainScreen.find((f) => f.name === "empty-search-national")!.data.seap.search.total;

export const National: Story = {
  // copy and locale follow the toolbar's language in `render`; the args only satisfy the types
  args: { total: national, copy: copy.en, locale: "en" },
  render: (_args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    return <TotalSummary total={national} copy={copy[locale]} locale={locale} />;
  },
};
