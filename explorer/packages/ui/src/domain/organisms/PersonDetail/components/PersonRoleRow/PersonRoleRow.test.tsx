import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { PersonRoleRow } from "./index.ts";

const show = (props: Partial<Parameters<typeof PersonRoleRow>[0]> = {}) =>
  renderInUi(
    <ul>
      <PersonRoleRow organisationName="ALFA SRL" href="/explore/supplier/1" detail="CUI 1" role="administrator" {...props} />
    </ul>,
    "en",
  );

describe("PersonRoleRow", () => {
  it("links an organisation that has a page, with its detail line and the role as a tag", () => {
    const go = vi.fn();
    show({ onNavigate: go });
    const link = screen.getByRole("link", { name: "ALFA SRL" });
    expect(link).toHaveAttribute("href", "/explore/supplier/1");
    fireEvent.click(link);
    expect(go).toHaveBeenCalledWith("/explore/supplier/1");
    expect(screen.getByText("CUI 1")).toBeVisible();
    expect(screen.getByText("administrator")).toBeVisible();
  });

  it("is plain text without a page", () => {
    show({ href: null, detail: "no organisation page" });
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("ALFA SRL")).toBeVisible();
    expect(screen.getByText("no organisation page")).toBeVisible();
  });
});
