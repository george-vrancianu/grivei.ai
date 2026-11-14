import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { peopleNone, peoplePrivate, peoplePublic } from "../../samples/people.ts";
import { PeopleSection } from "./index.ts";

const show = (people = peoplePublic, locale: "en" | "ro" = "en", onNavigate?: (href: string) => void) =>
  renderInUi(<PeopleSection people={people} personHref={(id) => `/explore/person/${id}`} onNavigate={onNavigate} locale={locale} copy={sampleCopy.peopleSection(locale)} />, locale);

describe("PeopleSection", () => {
  it("lists each holder with name, role as published and birth year, and cites the snapshot", () => {
    show();
    const section = screen.getByRole("region", { name: "Administrators and legal representatives" });
    expect(within(section).getByText("POPESCU ION")).toBeVisible();
    expect(within(section).getByText("administrator · born 1975")).toBeVisible();
    expect(within(section).getByText("administrator · born 1980")).toBeVisible();
    expect(within(section).getByRole("link", { name: "Source: ONRC, snapshot of 6 May 2026" })).toHaveAttribute("href", "https://data.gov.ro/dataset/firme-06-05-2026");
  });

  it("shows a holder with no birth date as an unlinked role holder, never as a link", () => {
    show(peoplePrivate);
    expect(screen.getByText("reprezentant al persoanei juridice · no birth date in ONRC: listed on this page only, linked to no one")).toBeVisible();
    expect(screen.queryByRole("link", { name: /SC SERVICII/ })).toBeNull();
  });

  it("links no one to a person page on a public host (no person from the API), and links each linked holder in a Private view", () => {
    const { unmount } = show(peoplePublic);
    expect(screen.queryByRole("link", { name: /person page/ })).toBeNull();
    unmount();
    const go = vi.fn();
    show(peoplePrivate, "en", go);
    const link = screen.getByRole("link", { name: "POPESCU ION: person page" });
    expect(link).toHaveAttribute("href", `/explore/person/${peoplePrivate.holders[1]!.person!.id}`);
    fireEvent.click(link);
    expect(go).toHaveBeenCalledWith(`/explore/person/${peoplePrivate.holders[1]!.person!.id}`);
  });

  it("says plainly when ONRC lists no holder, and has no dataset link without a URL", () => {
    show(peopleNone);
    expect(screen.getByText("ONRC lists no administrator or legal representative for this organisation.")).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("speaks Romanian and keeps ONRC's words as published", () => {
    show(peoplePublic, "ro");
    expect(screen.getByRole("region", { name: "Administratori și reprezentanți legali" })).toBeVisible();
    expect(screen.getByText("administrator · născut în 1975")).toBeVisible();
    expect(screen.getByText(/reprezentant al persoanei juridice · fără dată a nașterii/)).toBeVisible();
  });
});
