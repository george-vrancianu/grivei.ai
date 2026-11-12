import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RECORD_BADGES } from "../../../../atoms/BadgeChip/index.ts";
import { sampleCopy } from "../../../../samples/copy.ts";
import { BadgeChips } from "./index.ts";

const { badges } = sampleCopy.filterChips("en");

describe("BadgeChips", () => {
  it("offers every badge, in the catalogue's order, each with its explanation", () => {
    render(<BadgeChips label={badges.group} selected={["NO_VALUE"]} onToggle={() => {}} copy={badges.badges} />);
    const group = screen.getByRole("group", { name: "Record badges" });
    const buttons = Array.from(group.querySelectorAll("[role=button]"));
    expect(buttons.map((b) => b.textContent)).toEqual(RECORD_BADGES.map((badge) => badges.badges[badge].label));
    for (const badge of RECORD_BADGES) {
      const chip = screen.getByRole("button", { name: badges.badges[badge].label, pressed: badge === "NO_VALUE" });
      expect(chip).toHaveAccessibleDescription(badges.badges[badge].explanation);
    }
  });

  it.each(RECORD_BADGES)("reports %s when clicked", async (badge) => {
    const onToggle = vi.fn();
    render(<BadgeChips label={badges.group} selected={undefined} onToggle={onToggle} copy={badges.badges} />);
    await userEvent.click(screen.getByRole("button", { name: badges.badges[badge].label }));
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(badge);
  });
});
