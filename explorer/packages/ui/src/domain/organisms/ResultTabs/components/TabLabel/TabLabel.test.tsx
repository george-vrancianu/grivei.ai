import { renderInUi } from "../../../../../testing/render.tsx";
import { TabLabel } from "./index.ts";

describe("TabLabel", () => {
  it("shows the name and the count, with ≈ for an estimate", () => {
    const exact = renderInUi(<TabLabel name="Records" count={2400000} estimated={false} locale="en" />);
    expect(exact.container).toHaveTextContent(/^Records 2,400,000$/);
    exact.unmount();
    const estimated = renderInUi(<TabLabel name="Furnizori" count={240000} estimated locale="ro" />, "ro");
    expect(estimated.container).toHaveTextContent("Furnizori ≈ 240.000");
  });
});
