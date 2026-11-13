import { screen } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { highlightedRecord } from "../../../../samples/fixtureData.ts";
import { RecordMetaLine } from "./index.ts";

const record = { ...highlightedRecord.record, code: "CAN1145000", date: "2025-03-05", procedure: "Licitatie deschisa", channel: "CONTRACT" as const };

describe("RecordMetaLine", () => {
  it("shows the channel tag, the code, the date in a time element and the procedure as published", () => {
    const { container } = renderInUi(<RecordMetaLine record={record} locale="en" copy={sampleCopy.recordRow("en")} />);
    expect(screen.getByText("Contract")).toBeVisible();
    expect(screen.getByText("CAN1145000")).toBeVisible();
    expect(container.querySelector("time")).toHaveAttribute("datetime", "2025-03-05");
    expect(screen.getByText("Licitatie deschisa")).toBeVisible();
  });

  it("names the channel in Romanian", () => {
    renderInUi(<RecordMetaLine record={{ ...record, channel: "DIRECT_PURCHASE" }} locale="ro" copy={sampleCopy.recordRow("ro")} />, "ro");
    expect(screen.getByText("Achiziție directă")).toBeVisible();
  });

  it("leaves out a date and a procedure SEAP does not publish", () => {
    const { container } = renderInUi(<RecordMetaLine record={{ ...record, date: null, procedure: null }} locale="en" copy={sampleCopy.recordRow("en")} />);
    expect(container.querySelector("time")).toBeNull();
    expect(container).not.toHaveTextContent("Licitatie");
  });
});
