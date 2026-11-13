import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { catalogue } from "../../copy/index.ts";
import { OnlyMatchingLink } from "./index.ts";

describe.each(["en", "ro"] as const)("OnlyMatchingLink (%s)", (locale) => {
  const copy = catalogue[locale].entityPage.recordsTab.onlyMatching;
  it("names the query, diacritics kept, and links to the filtered Records tab", () => {
    render(<OnlyMatchingLink carried={{ q: "străzi" }} href="/x?q=a" copy={copy} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/x?q=a");
    expect(link).toHaveTextContent(copy.query("străzi"));
    expect(link.textContent).toContain("străzi");
  });
  it("says the search's filters when only chips were carried", () => {
    render(<OnlyMatchingLink carried={{ channel: "CONTRACT" }} href="/x" copy={copy} />);
    expect(screen.getByRole("link")).toHaveTextContent(copy.filters);
  });
});
