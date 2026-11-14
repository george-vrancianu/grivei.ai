// Sample copy and data for the financial-statements section's stories and tests, in both languages. The real strings are the app's catalogue (`entityPage.financials`).
import type { Locale } from "../../theme/index.ts";
import type { FinancialStatementsSectionCopy } from "../organisms/FinancialStatementsSection/index.ts";
import type { FinancialStatementsData, FinancialYearData } from "../types.ts";

export const financialsCopy: Record<Locale, FinancialStatementsSectionCopy> = {
  en: {
    heading: "Financial statements",
    intro: "Annual statements the company filed, as the Ministry of Finance (MF) publishes them on data.gov.ro, in RON. A blank cell in MF's file reads \"not reported\", never zero.",
    caption: "Annual financial statements by fiscal year, with the awards of the same year",
    columns: { year: "Fiscal year", turnover: "Turnover", profitOrLoss: "Profit or loss", debts: "Debts", equity: "Equity", employees: "Average employees", awarded: "Awarded that year", share: "Awards as a share of turnover", source: "Source" },
    row: {
      notReported: "not reported",
      revision: { firstRelease: "first release", revised: "revised", firstReleaseMayBeRevised: "first release, may be revised" },
      source: (file) => `MF, ${file}`,
      published: (published) => `Published ${published}`,
    },
    mayBeRevisedNote: "The newest year is a first release: MF re-publishes each year's statements a year later, with corrections, so read it with care.",
    contextNote: "Awards as a share of turnover is context, not a Signal, and is never added to awarded value. A contract's whole value counts in the year it was awarded, so a share can exceed 100% and is no share of revenue.",
  },
  ro: {
    heading: "Situații financiare",
    intro: "Situațiile financiare anuale depuse de companie, așa cum le publică Ministerul Finanțelor (MF) pe data.gov.ro, în RON. O celulă goală în fișierul MF se afișează „nedeclarat”, niciodată zero.",
    caption: "Situații financiare anuale pe an fiscal, cu atribuirile aceluiași an",
    columns: { year: "An fiscal", turnover: "Cifra de afaceri", profitOrLoss: "Profit sau pierdere", debts: "Datorii", equity: "Capitaluri", employees: "Număr mediu de salariați", awarded: "Atribuit în acel an", share: "Atribuiri ca pondere din cifra de afaceri", source: "Sursa" },
    row: {
      notReported: "nedeclarat",
      revision: { firstRelease: "prima publicare", revised: "revizuit", firstReleaseMayBeRevised: "prima publicare, poate fi revizuit" },
      source: (file) => `MF, ${file}`,
      published: (published) => `Publicat la ${published}`,
    },
    mayBeRevisedNote: "Cel mai recent an este prima publicare: MF republică situațiile fiecărui an după un an, cu corecturi, așa că citiți-l cu grijă.",
    contextNote: "Atribuirile ca pondere din cifra de afaceri sunt context, nu un Semnal, și nu se adună niciodată la valoarea atribuită. Valoarea întreagă a unui contract se numără în anul atribuirii, așa că ponderea poate depăși 100% și nu este o pondere din venituri.",
  },
};

const mf = (year: number, file: string, dataset: string, published: string) => ({
  file, datasetUrl: `https://data.gov.ro/dataset/${dataset}`, fileUrl: `https://data.gov.ro/dataset/${dataset}/resource/x/download/${file}`, via: `Situații financiare ${year}`,
  license: "CC-BY-4.0", published, fetchedAt: "2026-11-14T09:00:00Z",
});

/** Four years of one supplier: the newest a first release (blank employees and debts), a reported zero, a revised year with a loss, an older first release with blank employees. */
export const financialYears: FinancialYearData[] = [
  { fiscalYear: 2025, revision: "FIRST_RELEASE", mayBeRevised: true, turnover: "3000000000", profitOrLoss: "90000000", debts: null, equity: "300000000", averageEmployees: null,
    awardedInYear: "0", awardShareOfTurnover: 0, source: mf(2025, "web_bl_bs_sl_an2025.txt", "situatii_financiare_2025", "2026-06-11") },
  { fiscalYear: 2024, revision: "FIRST_RELEASE", mayBeRevised: false, turnover: "2000000000", profitOrLoss: "100000000", debts: "300000000", equity: "250000000", averageEmployees: 0,
    awardedInYear: "2500000", awardShareOfTurnover: 0.00125, source: mf(2024, "web_bl_bs_sl_an2024.txt", "situatii_financiare_2024", "2025-06-30") },
  { fiscalYear: 2023, revision: "REVISED", mayBeRevised: false, turnover: "1200000000", profitOrLoss: "-15000000", debts: "210000000", equity: "135000000", averageEmployees: 41,
    awardedInYear: "589000000", awardShareOfTurnover: 0.490833, source: mf(2023, "web_bl_bs_sl_an2023.txt", "situatii_financiare2023", "2025-07-27") },
  { fiscalYear: 2022, revision: "FIRST_RELEASE", mayBeRevised: false, turnover: "400000000", profitOrLoss: "20000000", debts: "100000000", equity: "90000000", averageEmployees: null,
    awardedInYear: "0", awardShareOfTurnover: 0, source: mf(2022, "web_bl_bs_sl_an2022.txt", "situatii_financiare_2022", "2023-08-28") },
];

export const financials: FinancialStatementsData = { years: financialYears };

/** A company whose newest year has a blank turnover (no share) and a share above 100%. */
export const financialsBlankTurnover: FinancialStatementsData = {
  years: [
    { ...financialYears[0]!, turnover: null, awardShareOfTurnover: null, awardedInYear: "35000000" },
    { ...financialYears[2]!, fiscalYear: 2024, awardedInYear: "1800000000", awardShareOfTurnover: 1.5 },
  ],
};
