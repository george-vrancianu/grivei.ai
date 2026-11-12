// Seam 3 for the Record page: the app rendered against the contract's mock responses.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

function open(url: string) {
  openAt(url);
  const { client, sent } = fixtureClient();
  render(<App client={client} />);
  return sent;
}
const valueOf = (label: string) => screen.getByText(label).nextElementSibling;
const region = (name: string) => within(screen.getByRole("region", { name }));

describe("a Record page", () => {
  it("opens a contract by its code: title, values, authority and winner", async () => {
    const sent = open("/explore/record/CAN1166685");
    expect(await screen.findByRole("heading", { level: 1, name: "Modernizare străzi, cartier Noua" })).toBeInTheDocument();
    expect(sent.map((s) => s.operation)).toEqual(["RecordPage"]);
    expect(sent[0]).toMatchObject({ variables: { code: "CAN1166685" } });
    expect(valueOf("Value as published")).toHaveTextContent("RON 12,800,000.00");
    expect(valueOf("Counted value")).toHaveTextContent("RON 12,800,000.00");
    expect(screen.getByText("Contracting authority").nextElementSibling).toHaveTextContent("MUNICIPIUL BRAȘOV");
    expect(within(screen.getByText("Winners").nextElementSibling as HTMLElement).getAllByRole("link")).toHaveLength(1);
  });

  it("shows loading first", () => {
    open("/explore/record/CAN1166685");
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("links the authority and the winner to their pages, in the language's prefix", async () => {
    open("/ro/explore/record/CAN1166685");
    await screen.findByRole("heading", { level: 1, name: "Modernizare străzi, cartier Noua" });
    const links = screen.getAllByRole("link").map((l) => l.getAttribute("href") ?? "");
    expect(links.some((h) => h.startsWith("/ro/explore/authority/"))).toBe(true);
    expect(links.some((h) => h.startsWith("/ro/explore/supplier/"))).toBe(true);
  });

  it("shows a consortium's full value, each member and the convention label", async () => {
    open("/explore/record/CAN1170001");
    await screen.findByRole("heading", { level: 1, name: "Reabilitare pod peste râul Olt" });
    expect(valueOf("Counted value")).toHaveTextContent("RON 30,000,000.00");
    expect(screen.getAllByText(/equal share RON 15,000,000.00/)).toHaveLength(2);
    expect(screen.getByText(/counting convention, not a figure SEAP publishes/)).toBeInTheDocument();
  });

  it("shows the framework line with its percentage and lists the subsequent contracts", async () => {
    open("/explore/record/CAN1160100");
    await screen.findByRole("heading", { level: 1, name: /Acord-cadru lucrări/ });
    expect(screen.getByText(/Ceiling RON 100,000,000.00; subsequent contracts reported so far RON 112,400,000.00 \(112.4%\)/)).toBeInTheDocument();
    expect(region("Framework agreement").getByRole("link", { name: /Contract subsecvent nr. 7/ })).toHaveAttribute("href", "/explore/record/CAN1180042");
  });

  it("never names or links a natural-person winner", async () => {
    open("/explore/record/DA12350005");
    await screen.findByRole("heading", { level: 1, name: "Servicii de consultanță juridică" });
    const winners = screen.getByText("Winners").nextElementSibling as HTMLElement;
    expect(winners).toHaveTextContent("Persoană fizică");
    expect(within(winners).queryByRole("link")).toBeNull();
  });

  it("says why a suspect value is not counted and states the rule", async () => {
    open("/explore/record/DA12399999");
    await screen.findByRole("heading", { level: 1, name: "Servicii de curățenie" });
    expect(valueOf("Counted value")).toHaveTextContent("breaks a counting rule");
    expect(region("Suspect value rule").getByText(/at least ten times the cap in force/)).toBeInTheDocument();
  });

  it("shows a Record with no value as 'No value in SEAP'", async () => {
    open("/explore/record/SCNA700123");
    await screen.findByRole("heading", { level: 1, name: /Anunț de atribuire fără valoare/ });
    expect(valueOf("Value as published")).toHaveTextContent("No value in SEAP");
  });

  it("shows each badge with its explanation", async () => {
    open("/explore/record/CAN1190777");
    await screen.findByRole("heading", { level: 1, name: /Livrare combustibil/ });
    const badges = region("Badges and what they mean");
    for (const explanation of [/awaiting the official bulk data/, /does not match the one ANAF confirms/, /never matched in the official bulk data/]) {
      expect(badges.getByText(explanation)).toBeVisible();
    }
  });

  it("has a Check in SEAP link that opens a new tab", async () => {
    open("/explore/record/DA12345678");
    await screen.findByRole("heading", { level: 1, name: /Deszăpezire/ });
    const link = region("Provenance").getByRole("link", { name: "Check in SEAP" });
    expect(link).toHaveAttribute("href", "https://e-licitatie.ro/pub/direct-acquisition/view/200000");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("says there is no stable public page when the Record has no URL", async () => {
    open("/explore/record/CAN1190777");
    await screen.findByRole("heading", { level: 1, name: /Livrare combustibil/ });
    expect(region("Provenance").queryByRole("link")).toBeNull();
    expect(region("Provenance").getByText(/no stable public page/)).toBeInTheDocument();
  });

  it("follows a link to another Record without a page load", async () => {
    open("/explore/record/CAN1180042");
    await screen.findByRole("heading", { level: 1, name: /Contract subsecvent nr. 7/ });
    // the framework's fixture exists for CAN1160100
    await userEvent.setup().click(screen.getByRole("link", { name: /Acord-cadru lucrări/ }));
    expect(window.location.pathname).toBe("/explore/record/CAN1160100");
    expect(await screen.findByRole("heading", { level: 1, name: /Acord-cadru lucrări/ })).toBeInTheDocument();
  });

  it("renders Romanian under /ro/", async () => {
    open("/ro/explore/record/CAN1160100");
    expect(await screen.findByRole("heading", { level: 1, name: /Acord-cadru lucrări/ })).toBeInTheDocument();
    expect(screen.getByText("Valoare publicată")).toBeInTheDocument();
    expect(screen.getByText(/Plafon .*contracte subsecvente raportate până acum/)).toBeInTheDocument();
    expect(region("Proveniență").getByRole("link", { name: "Verifică în SEAP" })).toBeInTheDocument();
  });

  it("says so when no Record has that code", async () => {
    open("/explore/record/CAN0000000");
    expect(await screen.findByRole("heading", { level: 1, name: "Record not found" })).toBeInTheDocument();
    expect(screen.getByText("No Record is published under the code CAN0000000.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the main screen" })).toHaveAttribute("href", "/explore/");
  });

  it("says so when the data could not be loaded", async () => {
    open("/explore/record/NOFIXTURE1");
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  });
});
