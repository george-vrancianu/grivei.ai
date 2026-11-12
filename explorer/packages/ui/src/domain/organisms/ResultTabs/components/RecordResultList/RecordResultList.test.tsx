import { screen } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { resultSamples } from "../../../../samples/fixtureData.ts";
import { RecordResultList } from "./index.ts";

describe("RecordResultList", () => {
  it("lists one row per Record, each title linked to its Record page", () => {
    const { rows } = resultSamples.variety.records;
    renderInUi(<RecordResultList rows={rows} entityHref={(e, role) => `/explore/${role}/${e.key}`} recordHref={(r) => `/explore/record/${r.code}`} locale="en" copy={sampleCopy.recordRow("en")} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(rows.length);
    expect(screen.getByRole("link", { name: rows[0]!.record.title })).toHaveAttribute("href", `/explore/record/${rows[0]!.record.code}`);
  });
});
