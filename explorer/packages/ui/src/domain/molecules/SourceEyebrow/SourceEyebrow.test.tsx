import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { SourceEyebrow } from "./index.ts";

const sources = [{ id: "SEAP", name: "SEAP" }, { id: "ONRC", name: "Registrul Comerțului" }];

describe("SourceEyebrow", () => {
  it("reads 'search SEAP · national · 2021 onward' with the Source's name from the API", () => {
    renderInUi(<SourceEyebrow sources={sources} selected="SEAP" copy={sampleCopy.sourceEyebrow("en")} />);
    expect(screen.getByTestId("source-eyebrow")).toHaveTextContent("search SEAP · national · 2021 onward");
  });

  it("names the selected Source, whichever it is", () => {
    renderInUi(<SourceEyebrow sources={sources} selected="ONRC" copy={sampleCopy.sourceEyebrow("en")} />);
    expect(screen.getByTestId("source-eyebrow")).toHaveTextContent("search Registrul Comerțului ·");
  });

  it("reads in Romanian", () => {
    renderInUi(<SourceEyebrow sources={sources} selected="SEAP" copy={sampleCopy.sourceEyebrow("ro")} />, "ro");
    expect(screen.getByTestId("source-eyebrow")).toHaveTextContent("caută SEAP · național · din 2021");
  });

  it("falls back to the id before the Sources arrive", () => {
    renderInUi(<SourceEyebrow sources={[]} selected="SEAP" copy={sampleCopy.sourceEyebrow("en")} />);
    expect(screen.getByTestId("source-eyebrow")).toHaveTextContent("search SEAP");
  });

  it("is read-only: no control to operate", () => {
    renderInUi(<SourceEyebrow sources={sources} selected="SEAP" copy={sampleCopy.sourceEyebrow("en")} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
