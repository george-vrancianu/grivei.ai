import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { SearchBar } from "../SearchBar/index.ts";
import { SearchPanel } from "./index.ts";

describe.each(["en", "ro"] as const)("SearchPanel (%s)", (locale) => {
  it("holds the search bar in a region of its own name", () => {
    renderInUi(
      <SearchPanel label="Search region">
        <SearchBar value="roads" onQueryChange={() => {}} copy={sampleCopy.searchBar(locale)} />
      </SearchPanel>,
      locale,
    );
    expect(within(screen.getByRole("region", { name: "Search region" })).getByRole("searchbox")).toHaveValue("roads");
  });
});
