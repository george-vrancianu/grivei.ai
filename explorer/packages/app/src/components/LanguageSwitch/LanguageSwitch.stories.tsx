import type { Meta, StoryObj } from "@storybook/react-vite";
import { catalogue } from "../../copy/index.ts";
import { LanguageSwitch } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/LanguageSwitch" };
export default meta;

export const Switch: StoryObj = {
  render: (_args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    const to = locale === "ro" ? "en" : "ro";
    return <LanguageSwitch copy={catalogue[locale].language} to={to} href={to === "ro" ? "/ro/explore/coverage" : "/explore/coverage"} />;
  },
};
