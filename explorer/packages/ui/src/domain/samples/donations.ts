// Sample copy and data for the firm-donations section's stories and tests, in both languages. The real strings are the app's catalogue (`entityPage.donations`).
import type { Locale } from "../../theme/index.ts";
import type { FirmDonationsSectionCopy } from "../organisms/FirmDonationsSection/index.ts";
import type { FirmDonationsData } from "../types.ts";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const donationsCopy: Record<Locale, FirmDonationsSectionCopy> = {
  en: {
    heading: "Firm donations to parties",
    supplierContext: (donations, loans) => `This supplier is also a firm donor: ${plural(donations, "donation", "donations")} and ${plural(loans, "loan", "loans")} to parties. Context only, not a Signal.`,
    intro: (year) => `Donations and loans this company made to parties, as BaniPartide lists them from the parties' annual publications, in RON. Data through ${year}: donations after that may be missing.`,
    caption: "Firm donations and loans to parties, newest first",
    columns: { date: "Date", party: "Party (as published)", kind: "Kind", amount: "Amount", source: "Source" },
    row: {
      kind: { DONATION: "Donation", LOAN: "Loan" },
      dateNotStated: "not stated",
      source: (row) => `BaniPartide, row ${row}`,
      underlying: "from the parties' publications (Monitorul Oficial, AEP)",
    },
    contextNote: "A firm donation is context, not a Signal. It is never a Party, and its amounts are never summed or added to awarded value. Dates are shown only where BaniPartide's published cell gives one; otherwise the cell is shown as published.",
    attribution: (publisher, license, fetched) => `BaniPartide${publisher ? ` (${publisher})` : ""}${license ? `, licence ${license}` : ""}; table fetched ${fetched}.`,
    methodologyLink: "How BaniPartide sources its data",
  },
  ro: {
    heading: "Donații ale firmei către partide",
    supplierContext: (donations, loans) => `Acest furnizor este și o firmă donatoare: ${plural(donations, "donație", "donații")} și ${plural(loans, "împrumut", "împrumuturi")} către partide. Doar context, nu un Semnal.`,
    intro: (year) => `Donațiile și împrumuturile acordate de această companie partidelor, așa cum le listează BaniPartide din publicările anuale ale partidelor, în RON. Date până în ${year}: donațiile de după acest an pot lipsi.`,
    caption: "Donații și împrumuturi ale firmei către partide, cele mai recente primele",
    columns: { date: "Data", party: "Partid (cum este publicat)", kind: "Tip", amount: "Suma", source: "Sursa" },
    row: {
      kind: { DONATION: "Donație", LOAN: "Împrumut" },
      dateNotStated: "nespecificată",
      source: (row) => `BaniPartide, rândul ${row}`,
      underlying: "din publicările partidelor (Monitorul Oficial, AEP)",
    },
    contextNote: "O donație a unei firme este context, nu un Semnal. Nu este niciodată un Partid, iar sumele ei nu se adună niciodată între ele și nici la valoarea atribuită. Data apare doar unde celula publicată de BaniPartide dă una; altfel celula este arătată așa cum a fost publicată.",
    attribution: (publisher, license, fetched) => `BaniPartide${publisher ? ` (${publisher})` : ""}${license ? `, licența ${license}` : ""}; tabel preluat la ${fetched}.`,
    methodologyLink: "Cum își culege BaniPartide datele",
  },
};

const source = {
  datasetUrl: "https://www.banipartide.ro/donatori-persoane-juridice.html", license: "CC Attribution 4.0 License", licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
  publisher: "Expert Forum", publisherUrl: "https://expertforum.ro/tag/finantare-politica/", underlyingUrl: "https://www.banipartide.ro/metodologie.html", fetchedAt: "2026-11-14T09:00:00Z",
};

/** A supplier that is also a firm donor: a loan whose cell lists two dates (no date claimed), and a donation with one readable date. */
export const donations: FirmDonationsData = {
  dataThroughYear: 2024, donationCount: 1, loanCount: 1, source,
  items: [
    { kind: "LOAN", party: "PSD", year: 2024, date: null, dateText: "20.01.2024; 15.05.2024", amount: "25000050", sourceRow: 2 },
    { kind: "DONATION", party: "PNL", year: 2023, date: "2023-03-15", dateText: "15.03.2023", amount: "5000000", sourceRow: 1 },
  ],
};

/** One donation to an alliance written the way BaniPartide publishes it, with no date cell (the year stands in) and a row with neither. */
export const donationsUndated: FirmDonationsData = {
  dataThroughYear: 2024, donationCount: 3, loanCount: 0, source: { ...source, license: null, licenseUrl: null, publisher: null, underlyingUrl: null },
  items: [
    { kind: "DONATION", party: "PSD+PC", year: 2021, date: null, dateText: "", amount: "1200000", sourceRow: 4 },
    { kind: "DONATION", party: "pnl", year: null, date: null, dateText: "", amount: "70000", sourceRow: 5 },
    { kind: "DONATION", party: "USR", year: 2020, date: "2020-10-04", dateText: "4102020", amount: "800536", sourceRow: 3 },
  ],
};
