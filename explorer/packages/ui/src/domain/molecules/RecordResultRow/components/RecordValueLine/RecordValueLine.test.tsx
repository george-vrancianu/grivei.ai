import { screen } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { consortiumRecord, highlightedRecord, noValueRecord } from "../../../../samples/fixtureData.ts";
import { RecordValueLine } from "./index.ts";

const copy = sampleCopy.recordRow("en");

describe("RecordValueLine", () => {
  it("shows the value, the date in a time element and the badges", () => {
    const { container } = renderInUi(<RecordValueLine record={highlightedRecord.record} locale="en" copy={copy} />);
    expect(container).toHaveTextContent("RON 300,000");
    expect(container.querySelector("time")).toHaveAttribute("datetime", highlightedRecord.record.date!);
  });

  it("says 'no value' for a null value", () => {
    renderInUi(<RecordValueLine record={noValueRecord.record} locale="en" copy={copy} />);
    expect(screen.getByText("no value")).toBeVisible();
  });

  it("marks a consortium and keeps every badge", () => {
    renderInUi(<RecordValueLine record={consortiumRecord.record} locale="en" copy={copy} />);
    expect(screen.getByText("consortium")).toBeVisible();
    expect(screen.getByText("Consortium share")).toBeVisible();
  });
});
