import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { PageNav } from "./index.ts";

const meta = { title: "Domain/PageNav", component: PageNav } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const sample =
  (page: number, pages: number): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <PageNav page={page} pages={pages} pageHref={(n) => `?page=${n}`} locale={locale} copy={sampleCopy.fullResults(locale).pagination} />;
  };

export const FirstPage: Story = { render: sample(1, 5) };
export const MiddlePage: Story = { render: sample(3, 5) };
export const ManyPages: Story = { render: sample(12, 40) };
