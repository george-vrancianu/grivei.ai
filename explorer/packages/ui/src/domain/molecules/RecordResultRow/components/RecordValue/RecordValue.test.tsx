import { screen } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { ceilingRecord, highlightedRecord, noValueRecord } from "../../../../samples/fixtureData.ts";
import { RecordValue } from "./index.ts";

describe("RecordValue", () => {
  it("shows the value over 'awarded value'", () => {
    renderInUi(<RecordValue record={highlightedRecord.record} locale="en" copy={sampleCopy.recordRow("en")} />);
    expect(screen.getByText("RON 5,000")).toBeVisible();
    expect(screen.getByText("awarded value")).toBeVisible();
  });

  it("says 'ceiling, not summed' for a framework ceiling", () => {
    renderInUi(<RecordValue record={ceilingRecord.record} locale="en" copy={sampleCopy.recordRow("en")} />);
    expect(screen.getByText("ceiling, not summed")).toBeVisible();
    expect(screen.queryByText("awarded value")).toBeNull();
  });

  it("says 'no value' with no caption", () => {
    renderInUi(<RecordValue record={noValueRecord.record} locale="en" copy={sampleCopy.recordRow("en")} />);
    expect(screen.getByText("no value")).toBeVisible();
    expect(screen.queryByText("awarded value")).toBeNull();
  });

  it("reads in Romanian and holds a line under the caption", () => {
    renderInUi(<RecordValue record={ceilingRecord.record} locale="ro" copy={sampleCopy.recordRow("ro")}><span>extra</span></RecordValue>, "ro");
    expect(screen.getByText("plafon, neadunat")).toBeVisible();
    expect(screen.getByText("extra")).toBeVisible();
  });
});
