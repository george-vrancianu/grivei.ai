import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { highlightedRecord } from "../../../../samples/fixtureData.ts";
import { MatchedLine } from "./index.ts";

describe("MatchedLine", () => {
  it("names the field and marks exactly the matched ranges", () => {
    const matchedField = highlightedRecord.matchedField!;
    const { container } = renderInUi(<MatchedLine matchedField={matchedField} copy={sampleCopy.recordRow("en")} />);
    expect(container).toHaveTextContent("Matched in title:");
    expect([...container.querySelectorAll("mark")].map((m) => m.textContent)).toEqual(
      matchedField.highlights.map(([s, e]) => matchedField.text.slice(s!, e!)),
    );
  });

  it("reads in Romanian", () => {
    const { container } = renderInUi(<MatchedLine matchedField={highlightedRecord.matchedField!} copy={sampleCopy.recordRow("ro")} />, "ro");
    expect(container).toHaveTextContent("Potrivit în titlu:");
  });
});
