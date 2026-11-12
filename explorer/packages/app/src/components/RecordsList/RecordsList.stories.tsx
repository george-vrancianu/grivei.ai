import type { Meta, StoryObj } from "@storybook/react-vite";
import { fixtures } from "@grivei/contract/fixtures";
import { copy } from "../../copy.ts";
import { RecordsList } from "./index.ts";

const meta = { title: "App/RecordsList", component: RecordsList } satisfies Meta<typeof RecordsList>;
export default meta;
type Story = StoryObj<typeof meta>;

const search = (name: string) => fixtures.MainScreen.find((f) => f.name === name)!.data.seap.search;

// copy and locale are replaced by the toolbar's language in `render`; the args only satisfy the types
const base = { copy: copy.en, locale: "en" } as const;

const render: Story["render"] = (args, { globals }) => {
  const locale = globals["locale"] === "ro" ? "ro" : "en";
  return <RecordsList page={args.page} copy={copy[locale]} locale={locale} />;
};

export const Typical: Story = { args: { ...base, page: search("empty-search-national").records }, render };
/** Every Record state at once: consortium, framework, suspect, no value, natural person. */
export const Variety: Story = { args: { ...base, page: search("records-variety").records }, render };
export const Empty: Story = { args: { ...base, page: { count: 0, rows: [] } }, render };
