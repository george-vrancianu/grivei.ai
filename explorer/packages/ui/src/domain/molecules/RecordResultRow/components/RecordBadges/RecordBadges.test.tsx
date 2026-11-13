import { screen } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { consortiumRecord, highlightedRecord } from "../../../../samples/fixtureData.ts";
import { RecordBadges } from "./index.ts";

const copy = sampleCopy.recordRow("en");

describe("RecordBadges", () => {
  it("marks a consortium and keeps every badge", () => {
    renderInUi(<RecordBadges record={consortiumRecord.record} copy={copy} />);
    expect(screen.getByText("consortium")).toBeVisible();
    expect(screen.getByText("Consortium share")).toBeVisible();
  });

  it("renders nothing for a single winner with no badge", () => {
    const { container } = renderInUi(<RecordBadges record={{ ...highlightedRecord.record, badges: [] }} copy={copy} />);
    expect(container).toBeEmptyDOMElement();
  });
});
