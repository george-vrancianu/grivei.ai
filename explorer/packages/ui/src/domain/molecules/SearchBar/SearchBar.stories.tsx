import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { pick } from "../../../workbench/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { SearchBar, type SearchBarProps } from "./index.ts";

const meta = { title: "Domain/SearchBar", component: SearchBar } satisfies Meta<SearchBarProps>;
export default meta;
type Story = StoryObj<Partial<SearchBarProps>>;

const localeOf = (global: unknown) => pick(global, { en: "en" as const, ro: "ro" as const });

function Demo({ locale, initial = "", loading = false }: { locale: "en" | "ro"; initial?: string; loading?: boolean }) {
  const [query, setQuery] = useState(initial);
  return (
    <div style={{ maxWidth: 560 }}>
      <SearchBar value={query} onQueryChange={setQuery} loading={loading} copy={sampleCopy.searchBar(locale)} />
      <p data-testid="emitted">{query}</p>
    </div>
  );
}

/** Nothing typed: the placeholder says the data is in Romanian. */
export const Empty: Story = { render: (_a, { globals }) => <Demo locale={localeOf(globals["locale"])} /> };

/** A query is committed (as from the URL): the text and the clear button show. */
export const Typing: Story = {
  render: (_a, { globals }) => <Demo locale={localeOf(globals["locale"])} initial="deszăpezire" />,
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("searchbox");
    await userEvent.type(box, " drumuri");
    await expect(box).toHaveValue("deszăpezire drumuri");
  },
};

/** One character: no search is made and a quiet hint says why. */
export const OneCharacter: Story = {
  render: (_a, { globals }) => <Demo locale={localeOf(globals["locale"])} />,
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("searchbox");
    await userEvent.type(box, "d");
    await expect(within(canvasElement).getByTestId("emitted")).toBeEmptyDOMElement();
  },
};

/** A search is running: a small spinner and `aria-busy`. */
export const Loading: Story = { render: (_a, { globals }) => <Demo locale={localeOf(globals["locale"])} initial="deszăpezire" loading /> };

/** The clear button empties the box at once. */
export const Cleared: Story = {
  render: (_a, { globals }) => <Demo locale={localeOf(globals["locale"])} initial="deszăpezire" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Clear search|Șterge căutarea/ }));
    await expect(canvas.getByRole("searchbox")).toHaveValue("");
  },
};
