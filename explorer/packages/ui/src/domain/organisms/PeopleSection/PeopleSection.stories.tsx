import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { peopleNone, peoplePrivate, peoplePublic } from "../../samples/people.ts";
import type { OrganisationPeopleData } from "../../types.ts";
import { PeopleSection } from "./index.ts";

const meta = { title: "Domain/PeopleSection", component: PeopleSection } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const story =
  (people: OrganisationPeopleData): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <PeopleSection people={people} personHref={(id) => `/explore/person/${id}`} locale={locale} copy={sampleCopy.peopleSection(locale)} />;
  };

/** The public host: name, role and birth year, an unlinked role holder with no birth date, and no link to a person page. */
export const Public: Story = { render: story(peoplePublic) };
/** A Private view (the host's Restricted switch is `show`): each linked holder links to a person page; the unlinked one never does. */
export const PrivateView: Story = { render: story(peoplePrivate) };
/** A sole trader's or an IF's page, or a registration with no holder in the snapshot. */
export const NoHolders: Story = { render: story(peopleNone) };
