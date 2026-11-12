import { composeStories } from "@storybook/react-vite";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import preview from "../../../.storybook/preview.tsx";

// Every story of the app, rendered in both languages (the same pattern as packages/ui/src/workbench/stories.test.tsx).
const modules = Object.entries(import.meta.glob<Record<string, unknown>>("./**/*.stories.tsx", { eager: true }));

describe.each(["en", "ro"] as const)("the app's stories in %s", (locale) => {
  describe.each(modules)("%s", (_path, module) => {
    const stories = composeStories(module as never, { ...preview, initialGlobals: { locale } } as never) as Record<string, React.ComponentType>;
    it.each(Object.entries(stories))("%s renders", (_name, Story) => {
      const { container } = render(<Story />);
      expect(container).not.toBeEmptyDOMElement();
    });
  });
});
