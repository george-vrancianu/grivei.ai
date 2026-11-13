import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link } from "../../../atoms/Link/index.ts";
import { pick } from "../../../workbench/index.ts";
import { StateNote } from "./index.ts";

const meta = { title: "Domain/StateNote", component: StateNote } satisfies Meta<typeof StateNote>;
export default meta;
type Story = StoryObj<typeof meta>;

const words = {
  loading: { en: "Loading…", ro: "Se încarcă…" },
  error: { en: "Something went wrong. Try again.", ro: "Ceva nu a mers. Încearcă din nou." },
  empty: { en: "No Records match.", ro: "Nicio înregistrare nu se potrivește." },
};
const story = (kind: keyof typeof words, withAction = false): Story => ({
  args: { kind, children: null },
  render: (args, { globals }) => (
    <StateNote {...args} action={withAction ? <Link href="/explore/?lens=coverage">{pick(globals["locale"], { en: "See what is covered", ro: "Vezi ce este acoperit" })}</Link> : undefined}>
      {pick(globals["locale"], words[kind])}
    </StateNote>
  ),
});
export const Loading = story("loading");
export const Failed = story("error");
export const Empty = story("empty");
export const EmptyWithAction = story("empty", true);
