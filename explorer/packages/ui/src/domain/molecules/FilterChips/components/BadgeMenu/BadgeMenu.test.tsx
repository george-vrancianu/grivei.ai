import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RECORD_BADGES } from "../../../../atoms/BadgeChip/index.ts";
import type { RecordBadge } from "../../../../types.ts";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { BadgeMenu } from "./index.ts";

const sample = sampleCopy.filterChips("en");
const { badges } = sample;
const setup = (selected?: RecordBadge[], onToggle = vi.fn()) => {
  renderInUi(<BadgeMenu label={badges.menu} selected={selected} onToggle={onToggle} copy={badges.badges} unsetLabel={sample.menuAny} picked={sample.picked} />);
  return onToggle;
};
const button = () => screen.getByRole("button", { name: /Badges/, hidden: true });

describe("BadgeMenu", () => {
  it("is named Badges and shows Any, the one pick's name, or the count", () => {
    setup();
    expect(button()).toHaveTextContent("Badges Any");
  });

  it("shows the name of a single pick", () => {
    setup(["NO_VALUE"]);
    expect(button()).toHaveTextContent(`Badges ${badges.badges.NO_VALUE.label}`);
  });

  it("shows the count of several", () => {
    setup(["NO_VALUE", "SUSPECT_VALUE"]);
    expect(button()).toHaveTextContent("Badges 2 picked");
  });

  it("offers every badge as a checkbox item, in the catalogue's order, each with its explanation as the tooltip", async () => {
    setup(["NO_VALUE"]);
    await userEvent.click(button());
    const items = screen.getAllByRole("menuitemcheckbox");
    expect(items.map((item) => item.textContent)).toEqual(RECORD_BADGES.map((badge) => badges.badges[badge].label));
    for (const badge of RECORD_BADGES) {
      const item = screen.getByRole("menuitemcheckbox", { name: badges.badges[badge].label, checked: badge === "NO_VALUE" });
      expect(item).toHaveAttribute("title", badges.badges[badge].explanation);
    }
  });

  it.each(RECORD_BADGES)("reports %s when clicked, and the menu stays open", async (badge) => {
    const onToggle = setup();
    await userEvent.click(button());
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: badges.badges[badge].label }));
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(badge);
    expect(screen.getByRole("menu")).toBeVisible();
  });
});
