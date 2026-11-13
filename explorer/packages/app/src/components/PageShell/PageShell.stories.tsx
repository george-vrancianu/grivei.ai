import type { Meta, StoryObj } from "@storybook/react-vite";
import { Typography } from "@grivei/ui";
import { catalogue } from "../../copy/index.ts";
import { PageShell } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/PageShell" };
export default meta;

/** The bare page with a state's message: the width and gutter of every page. */
export const Loading: StoryObj = {
  render: (_args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    return (
      <PageShell>
        <Typography role="status">{catalogue[locale].status.loading}</Typography>
      </PageShell>
    );
  },
};
