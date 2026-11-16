import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { ColumnHead } from "./index.ts";

describe("ColumnHead", () => {
  it("reads Supplier, Signals and RON matched, hidden from assistive tech (EN)", () => {
    const { container } = renderInUi(<ColumnHead role="supplier" copy={sampleCopy.entityRow("en").head} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container).toHaveTextContent("SupplierSignalsRON matched");
  });
  it("reads Autoritate, Semnale and RON potrivit for authorities (RO)", () => {
    const { container } = renderInUi(<ColumnHead role="authority" copy={sampleCopy.entityRow("ro").head} />, "ro");
    expect(container).toHaveTextContent("AutoritateSemnaleRON potrivit");
  });
});
