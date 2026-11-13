import type { Meta, StoryObj } from "@storybook/react-vite";
import { catalogue } from "../../../../copy/index.ts";
import { Header, type NavItem } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/AppShell/Header" };
export default meta;

const header = (current: NavItem | null): StoryObj => ({
  render: (_args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    const base = locale === "ro" ? "/ro/explore" : "/explore";
    const other = locale === "ro" ? "en" : "ro";
    return (
      <Header
        copy={catalogue[locale]}
        switchTo={{ locale: other, href: other === "ro" ? "/ro/explore/" : "/explore/" }}
        current={current}
        links={{ explore: `${base}/`, search: `${base}/search`, coverage: `${base}/coverage`, methodology: `${base}/methodology` }}
      />
    );
  },
});

/** One story per nav item: the current page is marked; the last has no nav item at all. */
export const Explore = header("explore");
export const Search = header("search");
export const Coverage = header("coverage");
export const Methodology = header("methodology");
export const NoCurrentPage = header(null);
