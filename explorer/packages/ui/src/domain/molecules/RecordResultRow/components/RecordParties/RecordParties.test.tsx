import { screen } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { consortiumRecord, naturalPersonRecord } from "../../../../samples/fixtureData.ts";
import { RecordParties } from "./index.ts";

const copy = sampleCopy.recordRow("en");
const entityHref = (entity: { key: string }, role: string) => `/explore/${role}/${entity.key}`;

describe("RecordParties", () => {
  it("links the authority and each winner in their role", () => {
    const { record } = consortiumRecord;
    renderInUi(<RecordParties record={record} entityHref={entityHref} copy={copy} />);
    expect(screen.getByRole("link", { name: record.authority.displayName })).toHaveAttribute("href", `/explore/authority/${record.authority.key}`);
    const first = record.winners[0]!.entity!;
    expect(screen.getByRole("link", { name: first.displayName })).toHaveAttribute("href", `/explore/supplier/${first.key}`);
  });

  it("shows a natural person as the label, without a link", () => {
    const { container } = renderInUi(<RecordParties record={naturalPersonRecord.record} entityHref={entityHref} copy={copy} />);
    expect(container).toHaveTextContent("Persoană fizică");
  });
});
