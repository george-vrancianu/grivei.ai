// Sample copy and data for the public-enterprise section's stories and tests, in both languages. The real strings are the app's catalogue (`entityPage.publicEnterprise`).
import type { Locale } from "../../theme/index.ts";
import type { PublicEnterpriseSectionCopy } from "../organisms/PublicEnterpriseSection/index.ts";
import type { PublicEnterpriseData } from "../types.ts";

export const publicEnterpriseCopy: Record<Locale, PublicEnterpriseSectionCopy> = {
  en: {
    heading: "Public enterprise (AMEPIP)",
    basis: (cui, published) => `CUI ${cui} is on AMEPIP's list of public enterprises under OUG 109/2011, published ${published}. The match is by CUI.`,
    listedAs: "Listed as", registrationNumber: "Registration number", status: "ONRC status (as AMEPIP writes it)",
    years: (first, last) => (first === last ? `Financial year ${first}` : `Financial years ${first}–${last}`),
    fetched: (fetched, license) => `Fetched ${fetched} from data.gov.ro${license ? `, licence ${license}` : ""}`,
    link: "AMEPIP's list on data.gov.ro",
  },
  ro: {
    heading: "Întreprindere publică (AMEPIP)",
    basis: (cui, published) => `CUI ${cui} se află pe lista AMEPIP a întreprinderilor publice din OUG 109/2011, publicată la ${published}. Potrivirea se face după CUI.`,
    listedAs: "Înscrisă ca", registrationNumber: "Număr de înregistrare", status: "Starea ONRC (cum o scrie AMEPIP)",
    years: (first, last) => (first === last ? `Anul financiar ${first}` : `Anii financiari ${first}–${last}`),
    fetched: (fetched, license) => `Preluată la ${fetched} de pe data.gov.ro${license ? `, licența ${license}` : ""}`,
    link: "Lista AMEPIP pe data.gov.ro",
  },
};

export const publicEnterprise: PublicEnterpriseData = {
  listedAs: "ALFA DEMO SRL", registrationNumber: "J40/1/2005", status: "funcţiune", firstYear: 2022, lastYear: 2023, snapshot: "2026-01-13",
  url: "https://data.gov.ro/dataset/amepip-indicatori-financiari-demo", via: "Date financiare si non-financiare", license: "CC-BY-4.0", fetchedAt: "2026-11-14T09:00:00Z",
};
export const publicEnterpriseBare: PublicEnterpriseData = {
  listedAs: "REGIA SOLO FORMULAR", registrationNumber: null, status: null, firstYear: 2023, lastYear: 2023, snapshot: "2026-01-13",
  url: null, via: null, license: null, fetchedAt: "2026-11-14T09:00:00Z",
};
