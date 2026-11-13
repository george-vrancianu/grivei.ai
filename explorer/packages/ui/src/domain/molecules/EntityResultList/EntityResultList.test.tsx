import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { resultSamples, signalRowSamples } from "../../samples/fixtureData.ts";
import { EntityResultList } from "./index.ts";

describe("EntityResultList", () => {
  it("lists one row per entity, each linked in the given role", () => {
    const { rows } = resultSamples.variety.suppliers;
    renderInUi(<EntityResultList rows={rows} role="supplier" entityHref={(e, role) => `/explore/${role}/${e.key}`} locale="en" copy={sampleCopy.entityRow("en")} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(rows.length);
    expect(screen.getByRole("link", { name: rows[0]!.entity.displayName })).toHaveAttribute("href", `/explore/supplier/${rows[0]!.entity.key}`);
  });

  it("sends each row's chip to the Overview of the list's role", () => {
    const { rows } = signalRowSamples.authorities;
    renderInUi(<EntityResultList rows={rows} role="authority" entityHref={(e, role) => `/explore/${role}/${e.key}`} locale="en" copy={sampleCopy.entityRow("en")} />);
    const chips = screen.getAllByRole("link", { name: /Signals?$/ });
    expect(chips).toHaveLength(rows.filter((r) => r.signalCount > 0).length);
    expect(chips[0]).toHaveAttribute("href", `/explore/authority/${rows[0]!.entity.key}#signals`);
  });
});
