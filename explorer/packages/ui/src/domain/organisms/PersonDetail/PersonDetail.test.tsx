import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { personPage, personSingleRole } from "../../samples/people.ts";
import { PersonDetail } from "./index.ts";

const show = (person = personPage, locale: "en" | "ro" = "en", onNavigate?: (href: string) => void) =>
  renderInUi(<PersonDetail person={person} entityHref={(key, role) => `/explore/${role.toLowerCase()}/${key}`} onNavigate={onNavigate} locale={locale} copy={sampleCopy.personDetail(locale)} />, locale);

describe("PersonDetail", () => {
  it("shows the name and the birth year only, and says it is a Private view", () => {
    show();
    expect(screen.getByRole("heading", { level: 1, name: "POPESCU ION" })).toBeVisible();
    expect(screen.getByText("born 1975")).toBeVisible();
    expect(screen.getByRole("note")).toHaveTextContent(/Private view/);
    expect(screen.queryByText(/1975-/)).toBeNull();
  });

  it("lists the roles across organisations with their count, linking an organisation that has a page", () => {
    const go = vi.fn();
    show(personPage, "en", go);
    const roles = screen.getByRole("region", { name: "Roles" });
    expect(within(roles).getByText("Roles · 3 roles")).toBeVisible();
    const link = within(roles).getByRole("link", { name: "ALFA ONRC SRL" });
    expect(link).toHaveAttribute("href", "/explore/supplier/3100020");
    fireEvent.click(link);
    expect(go).toHaveBeenCalledWith("/explore/supplier/3100020");
    expect(within(roles).getByRole("link", { name: "BETA ONRC SRL" })).toHaveAttribute("href", "/explore/authority/3100039"); // the entity's own role page
    expect(within(roles).getByText("administrator · no organisation page")).toBeVisible();
    expect(within(roles).queryByRole("link", { name: "FARA CUI SRL" })).toBeNull();
  });

  it("cites the snapshot, and is plain text without a dataset link", () => {
    const { unmount } = show();
    expect(screen.getByRole("link", { name: "Source: ONRC, snapshot of 6 May 2026" })).toHaveAttribute("href", "https://data.gov.ro/dataset/firme-06-05-2026");
    unmount();
    show(personSingleRole);
    expect(screen.getByText("Roles · 1 role")).toBeVisible();
    expect(screen.getByText("Source: ONRC, snapshot of 6 May 2026")).toBeVisible();
  });

  it("speaks Romanian and keeps the name as ONRC writes it", () => {
    show(personSingleRole, "ro");
    expect(screen.getByRole("heading", { level: 1, name: "DUMITRESCU ȘTEFAN-VLAD CONSTANTIN-ALEXANDRU" })).toBeVisible();
    expect(screen.getByText("anul nașterii 1970")).toBeVisible();
    expect(screen.getByText("Roluri · 1 rol")).toBeVisible();
  });
});
