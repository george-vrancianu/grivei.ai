import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { SearchBar } from "../SearchBar/index.ts";
import { SearchPanel } from "./index.ts";

const meta = { title: "Domain/SearchPanel", component: SearchPanel } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const sample =
  (value: string, loading = false): Story["render"] =>
  (_args, { globals }) => {
    const locale = pick(globals["locale"], { en: "en" as const, ro: "ro" as const });
    return (
      <SearchPanel label={pick(globals["locale"], { en: "Search", ro: "Căutare" })}>
        <SearchBar value={value} onQueryChange={() => {}} loading={loading} copy={sampleCopy.searchBar(locale)} />
      </SearchPanel>
    );
  };

/** Nothing typed. */
export const Empty: Story = { render: sample("") };
/** A query in the box, with the spinner while it is unanswered. */
export const Typical: Story = { render: sample("deszăpezire", true) };
/** A long query stays inside the panel. */
export const LongQuery: Story = { render: sample("lucrări de întreținere și reparații la rețeaua de drumuri județene și comunale") };
