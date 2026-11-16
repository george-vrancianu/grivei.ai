import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { pick } from "../../../workbench/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { SourcePicker } from "../SourcePicker/index.ts";
import { SearchBar, type SearchBarProps } from "./index.ts";

const meta = { title: "Domain/SearchBar", component: SearchBar } satisfies Meta<SearchBarProps>;
export default meta;
type Story = StoryObj<Partial<SearchBarProps>>;

const localeOf = (global: unknown) => pick(global, { en: "en" as const, ro: "ro" as const });

function Demo({ locale, initial = "", loading = false, withSources = false }: { locale: "en" | "ro"; initial?: string; loading?: boolean; withSources?: boolean }) {
  const [query, setQuery] = useState(initial);
  const [source, setSource] = useState("SEAP");
  const picker = <SourcePicker inline selected={source} onSelect={setSource} options={[{ id: "SEAP", label: "SEAP" }, { id: "ONRC", label: "ONRC" }]} copy={{ label: locale === "ro" ? "Sursă" : "Source" }} />;
  return (
    <div style={{ maxWidth: withSources ? 760 : 560 }}>
      <SearchBar value={query} onQueryChange={setQuery} loading={loading} copy={sampleCopy.searchBar(locale)} {...(withSources ? { endSlot: picker } : {})} />
      <p data-testid="emitted">{query}</p>
    </div>
  );
}

/** Nothing typed: the placeholder says the data is in Romanian. */
export const Empty: Story = { render: (_a, { globals }) => <Demo locale={localeOf(globals["locale"])} /> };

/** Text is being typed over a committed query (as from the URL): the clear button shows and the emission is still pending. */
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

/** The Source picker inside the field, at its end (a dropdown on a narrow screen). */
export const WithSourcePicker: Story = { render: (_a, { globals }) => <Demo locale={localeOf(globals["locale"])} initial="deszăpezire" withSources /> };
