import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { PersonDetailFailed } from "./index.ts";

it("keeps the notice and the breadcrumb around what it is given", () => {
  renderInUi(
    <PersonDetailFailed copy={sampleCopy.personDetail("en")} homeHref="/">
      <p role="alert">Could not load</p>
    </PersonDetailFailed>,
    "en",
  );
  expect(screen.getByRole("note")).toBeVisible();
  expect(screen.getByRole("navigation", { name: "You are here" })).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent("Could not load");
});
