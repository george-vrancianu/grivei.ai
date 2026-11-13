import { screen } from "@testing-library/react";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { manyAliasesOverview } from "../../../../samples/fixtureData.ts";
import { SeapNamesLine } from "./index.ts";

const show = (aliases: typeof manyAliasesOverview.aliases, locale: "en" | "ro" = "en") =>
  renderInUi(<SeapNamesLine aliases={aliases} locale={locale} copy={sampleCopy.entityHeader(locale).seapNames} />, locale);

describe("SeapNamesLine", () => {
  it("names three spellings, counts the others, and gives the Records and the dates", () => {
    show(manyAliasesOverview.aliases);
    const line = screen.getByText(/^Appears in SEAP as/);
    expect(line).toHaveTextContent("and 5 more");
    expect(line).toHaveTextContent(manyAliasesOverview.aliases[0]!.name);
    expect(line).not.toHaveTextContent(manyAliasesOverview.aliases[3]!.name);
  });

  it("says it in Romanian", () => {
    show(manyAliasesOverview.aliases, "ro");
    expect(screen.getByText(/^Apare în SEAP ca/)).toHaveTextContent("și încă 5");
  });

  it("renders nothing without a spelling", () => {
    show([]);
    expect(screen.queryByText(/Appears in SEAP as/)).toBeNull();
  });
});
