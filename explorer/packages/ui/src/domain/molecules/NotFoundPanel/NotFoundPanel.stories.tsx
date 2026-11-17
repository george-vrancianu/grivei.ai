import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../samples/copy.ts";
import { NotFoundPanel } from "./index.ts";

const meta = { title: "Domain/NotFoundPanel", component: NotFoundPanel } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const texts = {
  en: {
    back: "Back to the main screen",
    search: "Search",
    address: ["Page not found", "Nothing in the explorer lives at this address. Check it for a typo, or start again from the main screen."],
    entity: ["Entity not found", "No authority or supplier is published under this key."],
    person: ["Person page not available", "This page is not available on this host, or no person has this id. Person pages are shown only in a Private view."],
    record: ["Record not found", "No Record is published under the code CAN0000000."],
  },
  ro: {
    back: "Înapoi la ecranul principal",
    search: "Căutare",
    address: ["Pagina nu a fost găsită", "La această adresă nu se află nimic în explorer. Verifică dacă este scrisă corect sau pornește din nou de la ecranul principal."],
    entity: ["Entitatea nu a fost găsită", "Nicio autoritate sau furnizor nu este publicat sub această cheie."],
    person: ["Pagina persoanei nu este disponibilă", "Această pagină nu este disponibilă pe această gazdă sau nicio persoană nu are acest id. Paginile persoanelor apar doar într-o vedere privată."],
    record: ["Înregistrarea nu a fost găsită", "Nicio înregistrare nu este publicată sub codul CAN0000000."],
  },
} as const;

const story = (state: "address" | "entity" | "person" | "record"): Story => ({
  render: (_a, { globals }) => {
    const locale = localeOf(globals["locale"]);
    const t = texts[locale];
    const prefix = locale === "ro" ? "/ro/explore" : "/explore";
    return (
      <NotFoundPanel
        title={t[state][0]}
        body={t[state][1]}
        primary={{ label: t.back, href: `${prefix}/` }}
        secondary={{ label: t.search, href: `${prefix}/search` }}
      />
    );
  },
});

export const UnknownAddress = story("address");
export const EntityNotFound = story("entity");
export const PersonNotAvailable = story("person");
export const RecordNotFound = story("record");
