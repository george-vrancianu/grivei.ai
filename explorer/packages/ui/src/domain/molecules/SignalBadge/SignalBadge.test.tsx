import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { noPublicationSignal, splittingSignal } from "../../samples/signals.ts";
import type { SignalData } from "../../types.ts";
import { SignalBadge } from "./index.ts";

function show(signal: SignalData, locale: Locale = "en", onNavigate?: (href: string) => void) {
  renderInUi(<SignalBadge signal={signal} href="/explore/authority/4000001/records?signal=splitting" onNavigate={onNavigate} locale={locale} copy={sampleCopy.signalCard(locale)} />, locale);
}

describe("the compact Signal badge", () => {
  it("is a link named by the rule's label and date, to the Signal's Records", () => {
    show(splittingSignal);
    expect(screen.getByRole("link", { name: /^Splitting, 19 Jul 2024/ })).toHaveAttribute("href", "/explore/authority/4000001/records?signal=splitting");
  });

  it("describes itself with the one-sentence wording", () => {
    show(splittingSignal);
    expect(screen.getByRole("link", { name: /Splitting/ })).toHaveAccessibleDescription(/^2 direct purchases in CPV group 770/);
  });

  it("reads in Romanian", () => {
    show(noPublicationSignal, "ro");
    expect(screen.getByRole("link", { name: /^Fără publicare, 1 dec\. 2023/ })).toBeVisible();
  });

  it("hands a plain click to onNavigate", async () => {
    const onNavigate = vi.fn();
    show(splittingSignal, "en", onNavigate);
    await userEvent.setup().click(screen.getByRole("link", { name: /Splitting/ }));
    expect(onNavigate).toHaveBeenCalledWith("/explore/authority/4000001/records?signal=splitting");
  });
});
