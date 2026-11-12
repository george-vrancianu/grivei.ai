import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authorityManyCounterpartiesOverview } from "../../../../samples/fixtureData.ts";
import { Consortia } from "./index.ts";

const consortia = authorityManyCounterpartiesOverview.overview.consortia;
const show = (list: typeof consortia) =>
  renderInUi(<Consortia consortia={list} entityHref={(e, r) => `/explore/${r}/${e.key}`} locale="en" copy={sampleCopy.entityOverview("en").consortia} />);

describe("Consortia", () => {
  it("lists the members as supplier links with their equal share, and says the share is a convention", () => {
    show(consortia);
    expect(screen.getByRole("link", { name: "CONSTRUCȚII TRANSILVANIA S.A." })).toHaveAttribute("href", "/explore/supplier/30000002");
    expect(screen.getAllByText(/equal share RON 15,000,000/)).toHaveLength(2);
    expect(screen.getByText(/counting convention/)).toBeVisible();
  });

  it("never names or links a natural person member", () => {
    const [first] = consortia;
    show([{ ...first!, members: [{ naturalPerson: true, publishedName: "Ion Popescu", share: "100", entity: null }, ...first!.members] }]);
    expect(screen.getByText("Persoană fizică")).toBeVisible();
    expect(screen.queryByText(/Ion Popescu/)).toBeNull();
  });

  it("is left out when there are no consortia", () => {
    show([]);
    expect(screen.queryByRole("region")).toBeNull();
  });
});
