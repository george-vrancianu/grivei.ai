import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppLink } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/AppLink" };
export default meta;

export const Internal: StoryObj = { render: () => <AppLink href="/explore/coverage">Coverage</AppLink> };
