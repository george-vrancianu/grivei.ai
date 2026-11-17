import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { NotFoundPanel } from "./index.ts";

const meta = { title: "Domain/NotFoundPanel", component: NotFoundPanel } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;


const story = (state: "address" | "entity" | "person" | "record"): Story => ({
  render: (_a, { globals }) => {
    const locale = localeOf(globals["locale"]);
    const t = sampleCopy.notFoundPanel(locale);
    const prefix = locale === "ro" ? "/ro/explore" : "/explore";
    return (
      <NotFoundPanel
        title={t[state][0]}
        body={t[state][1]}
        primary={{ label: t.back, href: `${prefix}/` }}
      />
    );
  },
});

export const UnknownAddress = story("address");
export const EntityNotFound = story("entity");
export const PersonNotAvailable = story("person");
export const RecordNotFound = story("record");
