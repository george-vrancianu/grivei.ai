import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { Button } from "../../../atoms/Button/index.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { StateNote } from "../../molecules/StateNote/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { personPage, personSingleRole } from "../../samples/people.ts";
import type { PersonPageData } from "../../types.ts";
import { PersonDetail, PersonDetailFailed, PersonDetailSkeleton } from "./index.ts";

const meta = { title: "Domain/PersonDetail", component: PersonDetail, parameters: { layout: "fullscreen" } } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const words = {
  loading: { en: "Loading…", ro: "Se încarcă…" },
  error: { en: "The data could not be loaded.", ro: "Datele nu au putut fi încărcate." },
  retry: { en: "Try again", ro: "Încearcă din nou" },
};

const entityHref = (key: string, role: string) => `/explore/${role.toLowerCase()}/${key}`;

const story =
  (person: PersonPageData, busy = false): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <PersonDetail
        person={person}
        homeHref="/"
        entityHref={entityHref}
        busy={busy}
        status={busy ? <LoadingStatus label={pick(locale, words.loading)} /> : undefined}
        locale={locale}
        copy={sampleCopy.personDetail(locale)}
      />
    );
  };

/** A Private view: a person with roles in three organisations, one with no organisation page. */
export const Typical: Story = { render: story(personPage) };
/** One role, a long compound name with comma-below letters, no dataset link. */
export const SingleRole: Story = { render: story(personSingleRole) };
/** A refetch: the last answer stays, dimmed with `aria-busy`, and the Roles header strip says it is loading. */
export const Busy: Story = { render: story(personPage, true) };
/** First load: real notice, breadcrumb, figure labels and Roles title around blocks. */
export const Loading: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <PersonDetailSkeleton copy={sampleCopy.personDetail(locale)} homeHref="/" status={<LoadingStatus label={pick(locale, words.loading)} />} />;
  },
};
/** The request failed: the error note with its retry sits in the person panel. */
export const Failed: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <PersonDetailFailed copy={sampleCopy.personDetail(locale)} homeHref="/">
        <StateNote
          kind="error"
          action={
            <Button size="small" onClick={() => undefined}>
              {pick(locale, words.retry)}
            </Button>
          }
        >
          {pick(locale, words.error)}
        </StateNote>
      </PersonDetailFailed>
    );
  },
};
