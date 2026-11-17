import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { personPage, personSingleRole } from "../../samples/people.ts";
import { PersonDetail, PersonDetailFailed, PersonDetailSkeleton } from "./index.ts";

const show = (person = personPage, locale: "en" | "ro" = "en", extra: { onNavigate?: (href: string) => void; busy?: boolean } = {}) =>
  renderInUi(
    <PersonDetail
      person={person}
      homeHref="/"
      entityHref={(key, role) => `/explore/${role.toLowerCase()}/${key}`}
      onNavigate={extra.onNavigate}
      busy={extra.busy}
      status={extra.busy ? <LoadingStatus label="Loading" /> : undefined}
      locale={locale}
      copy={sampleCopy.personDetail(locale)}
    />,
    locale,
  );

describe("PersonDetail", () => {
  it("says it is a Private view in one note, and has the breadcrumb and the name as ONRC wrote it", () => {
    show();
    expect(screen.getAllByRole("note")).toHaveLength(1);
    expect(screen.getByRole("note")).toHaveTextContent(/Private view/);
    const crumb = screen.getByRole("navigation", { name: "You are here" });
    expect(within(crumb).getByRole("link", { name: "explore" })).toHaveAttribute("href", "/");
    expect(crumb).toHaveTextContent("explore / person");
    expect(screen.getByRole("heading", { level: 1, name: "POPESCU ION" })).toBeVisible();
  });

  it("shows Born (the year only), Roles and Source with its snapshot as three figures", () => {
    show();
    const header = screen.getByRole("banner");
    expect(within(header).getByText("Born").parentElement).toHaveTextContent("Born 1975");
    expect(within(header).getByText("Roles").parentElement).toHaveTextContent("Roles 3");
    expect(within(header).getByText("Source").parentElement).toHaveTextContent("Source ONRC snapshot of 6 May 2026");
    expect(screen.queryByText(/1975-/)).toBeNull();
  });

  it("lists the roles with their count, key line and role tag, linking an organisation that has a page", () => {
    const go = vi.fn();
    show(personPage, "en", { onNavigate: go });
    const roles = screen.getByRole("region", { name: "Roles" });
    expect(within(roles).getByRole("heading", { level: 2, name: "Roles" })).toBeVisible();
    expect(within(roles).getByText("3 roles")).toBeVisible();
    const link = within(roles).getByRole("link", { name: "ALFA ONRC SRL" });
    expect(link).toHaveAttribute("href", "/explore/supplier/3100020");
    fireEvent.click(link);
    expect(go).toHaveBeenCalledWith("/explore/supplier/3100020");
    expect(within(roles).getByRole("link", { name: "BETA ONRC SRL" })).toHaveAttribute("href", "/explore/authority/3100039"); // the entity's own role page
    expect(within(roles).getByText("CUI 3100020 · supplier")).toBeVisible();
    expect(within(roles).getByText("CUI 3100039 · contracting authority")).toBeVisible();
    const rows = within(roles).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText("administrator")).toBeVisible();
    expect(within(rows[1]!).getByText("reprezentant legal")).toBeVisible();
    expect(within(rows[2]!).getByText("FARA CUI SRL")).toBeVisible();
    expect(within(rows[2]!).getByText("no organisation page")).toBeVisible();
    expect(within(rows[2]!).queryByRole("link")).toBeNull();
    expect(within(roles).getByText(/Roles are grouped by the same name/)).toBeVisible();
  });

  it("cites the snapshot, and is plain text without a dataset link", () => {
    const { unmount } = show();
    expect(screen.getByRole("link", { name: "Source: ONRC, snapshot of 6 May 2026" })).toHaveAttribute("href", "https://data.gov.ro/dataset/firme-06-05-2026");
    unmount();
    show(personSingleRole);
    expect(screen.getByText("1 role")).toBeVisible();
    expect(screen.getByText("Source: ONRC, snapshot of 6 May 2026")).toBeVisible();
  });

  it("speaks Romanian and keeps the name as ONRC writes it", () => {
    show(personSingleRole, "ro");
    expect(screen.getByRole("heading", { level: 1, name: "DUMITRESCU ȘTEFAN-VLAD CONSTANTIN-ALEXANDRU" })).toBeVisible();
    expect(screen.getByText("Născut(ă)").parentElement).toHaveTextContent("Născut(ă) 1970");
    expect(screen.getByText("Sursa", { selector: "span" }).parentElement).toHaveTextContent("instantaneu din 6 mai 2026");
    expect(screen.getByText("1 rol")).toBeVisible();
    expect(screen.getByText("CUI 3100063 · furnizor")).toBeVisible();
  });

  it("while busy dims the name, figures and roles with aria-busy, and leaves the header strip at full strength", () => {
    const { container } = show(personPage, "en", { busy: true });
    const roles = screen.getByRole("region", { name: "Roles" });
    expect(roles.querySelector("[data-panel-part=body]")).toHaveAttribute("aria-busy", "true");
    expect(roles.querySelector("[data-panel-part=header]")).not.toHaveAttribute("aria-busy");
    expect(within(roles).getByRole("status")).toHaveTextContent("Loading");
    expect(container.querySelectorAll("[aria-busy=true]").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("navigation", { name: "You are here" }).closest("[aria-busy]")).toBeNull();
  });

  it("is not busy by default", () => {
    const { container } = show();
    expect(container.querySelector("[aria-busy]")).toBeNull();
  });
});

describe.each(["en", "ro"] as const)("PersonDetailSkeleton (%s)", (locale) => {
  const copy = sampleCopy.personDetail(locale);
  const setup = () => renderInUi(<PersonDetailSkeleton copy={copy} homeHref="/" status={<LoadingStatus label="Loading" />} />, locale);

  it("keeps the real notice, breadcrumb, figure labels and Roles title", () => {
    setup();
    expect(screen.getAllByRole("note")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: copy.breadcrumb.label })).toBeVisible();
    for (const label of [copy.figures.born, copy.figures.roles, copy.figures.source]) expect(screen.getAllByText(label, { selector: "span" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: copy.rolesHeading })).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("says it is loading once, in the Roles header strip, and hides every block", () => {
    const { container } = setup();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(within(screen.getByRole("region", { name: copy.rolesHeading })).getByRole("status")).toHaveTextContent("Loading");
    const blocks = container.querySelectorAll(".MuiSkeleton-root");
    expect(blocks.length).toBeGreaterThan(5);
    for (const block of blocks) expect(block.closest("[aria-hidden=true]")).not.toBeNull();
    expect(container.querySelector("[aria-busy]")).toBeNull();
  });
});

describe("PersonDetailFailed", () => {
  it("keeps the notice and the breadcrumb around what it is given", () => {
    renderInUi(
      <PersonDetailFailed copy={sampleCopy.personDetail("en")} homeHref="/">
        <p role="alert">Could not load</p>
      </PersonDetailFailed>,
      "en",
    );
    expect(screen.getByRole("note")).toBeVisible();
    expect(screen.getByRole("navigation", { name: "You are here" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load");
  });
});
