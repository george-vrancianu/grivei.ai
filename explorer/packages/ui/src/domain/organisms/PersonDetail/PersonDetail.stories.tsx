import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { personPage, personSingleRole } from "../../samples/people.ts";
import type { PersonPageData } from "../../types.ts";
import { PersonDetail } from "./index.ts";

const meta = { title: "Domain/PersonDetail", component: PersonDetail, parameters: { layout: "fullscreen" } } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const story =
  (person: PersonPageData): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <PersonDetail person={person} entityHref={(key, role) => `/explore/${role.toLowerCase()}/${key}`} locale={locale} copy={sampleCopy.personDetail(locale)} />;
  };

/** A Private view: a person with roles in three organisations, one with no organisation page. */
export const Typical: Story = { render: story(personPage) };
/** One role, a long compound name with comma-below letters, no dataset link. */
export const SingleRole: Story = { render: story(personSingleRole) };
