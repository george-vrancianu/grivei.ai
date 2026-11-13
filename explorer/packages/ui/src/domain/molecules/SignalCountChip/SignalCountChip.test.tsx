import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { forbiddenWords } from "../../utils/signalWording.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { SignalCountChip } from "./index.ts";

function show(count: number, locale: Locale = "en") {
  renderInUi(<SignalCountChip count={count} href="/explore/supplier/2000007#signals" entityName="Alfa SRL" locale={locale} copy={sampleCopy.signalCount(locale)} />, locale);
}

describe("the Signals count chip", () => {
  it("is a link to the entity's Signals section, named by the count and the entity", () => {
    show(3);
    expect(screen.getByRole("link", { name: "3 Signals , Alfa SRL" })).toHaveAttribute("href", "/explore/supplier/2000007#signals");
  });

  it("uses the singular for one Signal", () => {
    show(1);
    expect(screen.getByRole("link", { name: "1 Signal , Alfa SRL" })).toBeVisible();
  });

  it.each([
    [1, "1 Semnal"],
    [2, "2 Semnale"],
    [19, "19 Semnale"],
    [20, "20 de Semnale"],
    [101, "101 Semnale"],
    [1200, "1.200 de Semnale"],
  ])("reads %i in Romanian as %s", (n, text) => {
    show(n, "ro");
    expect(screen.getByRole("link", { name: `${text} , Alfa SRL` })).toBeVisible();
  });

  it("carries the amber ring and no accusing word", () => {
    show(2);
    expect(document.querySelector("[data-signal-mark]")).not.toBeNull();
    for (const locale of ["en", "ro"] as const) for (const n of [1, 2, 20]) expect(forbiddenWords(sampleCopy.signalCount(locale).label(n, String(n)) + sampleCopy.signalCount(locale).forEntity("Alfa SRL"), locale)).toEqual([]);
  });
});
