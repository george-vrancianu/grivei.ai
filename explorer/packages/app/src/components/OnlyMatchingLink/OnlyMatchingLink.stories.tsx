import type { Meta, StoryObj } from "@storybook/react-vite";
import { catalogue } from "../../copy/index.ts";
import { OnlyMatchingLink } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/OnlyMatchingLink" };
export default meta;

const copyOf = (globals: Record<string, unknown>) => catalogue[globals["locale"] === "ro" ? "ro" : "en"].entityPage.recordsTab.onlyMatching;

/** The search had a query: the link names it (diacritics kept). */
export const WithQuery: StoryObj = {
  render: (_args, { globals }) => <OnlyMatchingLink carried={{ q: "străzi" }} href="/explore/supplier/123/records?q=str%C4%83zi" copy={copyOf(globals)} />,
};
/** The search had chips and no query: the link names the search's filters. */
export const ChipsOnly: StoryObj = {
  render: (_args, { globals }) => <OnlyMatchingLink carried={{ channel: "DIRECT_PURCHASE" }} href="/explore/supplier/123/records?channel=direct-purchase" copy={copyOf(globals)} />,
};
