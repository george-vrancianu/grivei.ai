import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { sampleOnrcCopy } from "../../samples/onrcCopy.ts";
import { OnrcResultsSkeleton } from "./index.ts";

describe.each(["en", "ro"] as const)("OnrcResultsSkeleton (%s)", (locale) => {
  const { title } = sampleOnrcCopy.results(locale);
  const setup = () => renderInUi(<OnrcResultsSkeleton title={title} status={<LoadingStatus label="Loading" />} />, locale);

  it("keeps the real title as the panel's heading and says it is loading in one status line", () => {
    setup();
    expect(screen.getByRole("heading", { level: 2, name: title })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("hides the placeholder rows from assistive technology", () => {
    setup();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
