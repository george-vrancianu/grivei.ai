import type { Locale } from "@grivei/ui";

// The tracer's few strings, in one place. The bilingual copy catalogue (#42) replaces this file.
export interface Copy {
  title: string;
  total: string;
  records: string;
  recordsList: string;
  loading: string;
  failed: string;
  empty: string;
  noValue: string;
  columns: { code: string; title: string; authority: string; supplier: string; date: string; value: string };
}

export const copy: Record<Locale, Copy> = {
  en: {
    title: "Explore public spending",
    total: "Total awarded",
    records: "Records",
    recordsList: "Records",
    loading: "Loading…",
    failed: "The data could not be loaded.",
    empty: "No Records yet.",
    noValue: "no value",
    columns: { code: "Code", title: "Title", authority: "Authority", supplier: "Supplier", date: "Date", value: "Value" },
  },
  ro: {
    title: "Explorează cheltuielile publice",
    total: "Total atribuit",
    records: "Înregistrări",
    recordsList: "Înregistrări",
    loading: "Se încarcă…",
    failed: "Datele nu au putut fi încărcate.",
    empty: "Nicio înregistrare încă.",
    noValue: "fără valoare",
    columns: { code: "Cod", title: "Titlu", authority: "Autoritate", supplier: "Furnizor", date: "Data", value: "Valoare" },
  },
};
