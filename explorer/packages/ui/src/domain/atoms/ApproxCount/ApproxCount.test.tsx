import { render, screen } from "@testing-library/react";
import { ApproxCount } from "./index.ts";

describe("ApproxCount", () => {
  it("leads an estimated count with ≈", () => {
    render(<ApproxCount count={66000} estimated locale="en" />);
    expect(screen.getByText(/^≈\s66,000$/)).toBeVisible();
  });
  it("shows an exact count without ≈", () => {
    render(<ApproxCount count={66000} estimated={false} locale="en" />);
    expect(screen.getByText("66,000")).toBeVisible();
    expect(screen.queryByText(/≈/)).toBeNull();
  });
  it("formats the number in the active language", () => {
    render(<ApproxCount count={1234567} estimated locale="ro" />);
    expect(screen.getByText(/^≈\s1\.234\.567$/)).toBeVisible();
  });
  it("shows zero", () => {
    render(<ApproxCount count={0} estimated={false} locale="en" />);
    expect(screen.getByText("0")).toBeVisible();
  });
});
