import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import preview from "../../../../.storybook/preview.tsx";
import { LOCALES } from "../theme/index.ts";

// Every story of every atom (and, later, of the app), rendered in both languages.
const modules = import.meta.glob<Record<string, unknown>>("../**/*.stories.tsx", { eager: true });
const files = Object.entries(modules);

describe("the workbench stories", () => {
  it("has a stories file for every atom", () => {
    const atoms = readdirSync(join(import.meta.dirname, "../atoms"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const withStories = files.map(([path]) => path.split("/").at(-2));
    expect(atoms.filter((atom) => !withStories.includes(atom))).toEqual([]);
  });

  describe.each(LOCALES)("in %s", (locale) => {
    describe.each(files)("%s", (path, module) => {
      // Compose with this locale as the initial `locale` global, as the toolbar switch would.
      const stories = composeStories(module as never, { ...preview, initialGlobals: { locale } } as never) as Record<
        string,
        React.ComponentType
      >;
      it.each(Object.entries(stories))("%s renders", (_name, Story) => {
        const { container } = render(<Story />);
        expect(container).not.toBeEmptyDOMElement();
        expect(path).toMatch(/\.stories\.tsx$/);
      });
    });
  });

  it.each([
    ["en", "Export results"],
    ["ro", "Exportă rezultatele"],
  ])("a story shows its %s sample string under that locale", (locale, text) => {
    const { Default } = composeStories(modules["../atoms/Button/Button.stories.tsx"] as never, {
      ...preview,
      initialGlobals: { locale },
    } as never) as Record<string, React.ComponentType>;
    const Story = Default!;
    render(<Story />);
    expect(screen.getByRole("button", { name: text })).toBeVisible();
  });
});
