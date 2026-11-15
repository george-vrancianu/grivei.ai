import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { pick } from "../../../../../workbench/index.ts";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { FilterMenu, MenuOption } from "./index.ts";

const meta = { title: "Domain/FilterChips/FilterMenu" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const group = (locale: unknown) => pick(locale, { en: "Procedure", ro: "Procedură" });
const any = (locale: unknown) => sampleCopy.filterChips(localeOf(locale)).menuAny;
// Source data: Romanian in both languages.
const NAMES = ["Achiziție directă", "Licitație deschisă", "Negociere fără publicare prealabilă"];

export const Unset: Story = {
  render: (_args, { globals }) => <FilterMenu label={group(globals["locale"])} value={undefined} unsetLabel={any(globals["locale"])}>{null}</FilterMenu>,
};

/** Set: the value in text and the accent outline. */
export const Set: Story = {
  render: (_args, { globals }) => <FilterMenu label={group(globals["locale"])} value="Licitație deschisă" unsetLabel={any(globals["locale"])}>{null}</FilterMenu>,
};

/** Open: the button takes the `line` fill; the menu floats 8 px below, left-aligned. */
export const OpenSingleChoice: Story = {
  render: (_args, { globals }) => (
    <FilterMenu label={group(globals["locale"])} value="Licitație deschisă" unsetLabel={any(globals["locale"])} defaultOpen>
      {({ close }) => NAMES.map((name) => <MenuOption key={name} role="menuitemradio" checked={name === "Licitație deschisă"} onChoose={close}>{name}</MenuOption>)}
    </FilterMenu>
  ),
};

function MultiDemo({ locale }: { locale: unknown }) {
  const [chosen, setChosen] = useState<string[]>(["Achiziție directă", "Licitație deschisă"]);
  const toggle = (name: string) => setChosen((now) => (now.includes(name) ? now.filter((n) => n !== name) : [...now, name]));
  return (
    <FilterMenu label={group(locale)} value={chosen.length === 0 ? undefined : chosen.length === 1 ? chosen[0] : `${chosen.length} ${pick(locale, { en: "chosen", ro: "alese" })}`} unsetLabel={any(locale)} defaultOpen>
      {NAMES.map((name) => <MenuOption key={name} role="menuitemcheckbox" checked={chosen.includes(name)} onChoose={() => toggle(name)}>{name}</MenuOption>)}
    </FilterMenu>
  );
}

/** Multi-select: `menuitemcheckbox` items; the menu stays open on a pick. */
export const OpenMultiSelect: Story = { render: (_args, { globals }) => <MultiDemo locale={globals["locale"]} /> };

/** Any content goes in: here two columns of plain lines, as the year menu will. */
export const OpenWithOtherContent: Story = {
  render: (_args, { globals }) => (
    <FilterMenu label={pick(globals["locale"], { en: "Award year", ro: "Anul atribuirii" })} value="2023–2025" unsetLabel={any(globals["locale"])} defaultOpen>
      <MenuOption role="menuitemradio" checked onChoose={() => {}}>2023</MenuOption>
      <MenuOption role="menuitemradio" checked={false} onChoose={() => {}}>2024</MenuOption>
    </FilterMenu>
  ),
};
