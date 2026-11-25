// PROTOTYPE (#343), throwaway. A hand-written conversation shaped like what the Assistant would return for ALFA DEMO SRL,
// built from the contract fixtures' numbers (EntityOverview / EntityRecords for supplier 2000007). Nothing here calls a model.

export type Ref =
  | { kind: "entity"; role: "supplier" | "authority"; key: string; name: string }
  | { kind: "record"; code: string; title: string; date: string }
  | { kind: "signal"; rule: string; label: string; href: string };

/** One piece of answer text. `claim` carries the ids the citation check matched; `unverified` is a claim the check could not match. */
export type Seg =
  | { t: "text"; s: string }
  | { t: "entity"; ref: Extract<Ref, { kind: "entity" }> }
  | { t: "claim"; s: string; refs: Ref[] }
  | { t: "unverified"; s: string; why: string };

export interface OutsideSource {
  url: string;
  site: string;
  title: string;
  fetchedAt: string;
  excerpt: string;
}

export type Block =
  | { type: "para"; segs: Seg[] }
  | { type: "caveat"; segs: Seg[] }
  | { type: "lead"; segs: Seg[]; refs: Ref[] }
  | { type: "outside"; intro: string; sources: OutsideSource[]; segs: Seg[] };

export type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; blocks: Block[]; dataThrough: string; toolCalls: number };

export const ALFA: Extract<Ref, { kind: "entity" }> = { kind: "entity", role: "supplier", key: "2000007", name: "ALFA DEMO SRL" };
export const SPITAL: Extract<Ref, { kind: "entity" }> = { kind: "entity", role: "authority", key: "1000017", name: "SPITALUL EXEMPLU" };
export const COMUNA: Extract<Ref, { kind: "entity" }> = { kind: "entity", role: "authority", key: "1000009", name: "COMUNA EXEMPLU" };
export const CNAIR: Extract<Ref, { kind: "entity" }> = { kind: "entity", role: "authority", key: "2000031", name: "CNAIR DEMO SA" };

const rec = (code: string, title: string, date: string): Ref => ({ kind: "record", code, title, date });
const R1 = rec("CAN9600001~2", "Contract CAN9600001 2", "2023-01-25");
const R2 = rec("CAN9600001~3", "Contract CAN9600001 3", "2023-01-25");
const R3 = rec("CAN9600001~1", "Contract CAN9600001 1 (framework agreement)", "2023-01-25");
const R4 = rec("CAN9600002~1", "Contract CAN9600002 1", "2023-02-10");
const R5 = rec("CAN9600008~1", "Contract CAN9600008 1", "2023-03-20");
const R6 = rec("DA96000004", "Achizitie DA96000004", "2023-03-05");

const text = (s: string): Seg => ({ t: "text", s });
const ent = (ref: Extract<Ref, { kind: "entity" }>): Seg => ({ t: "entity", ref });
const claim = (s: string, ...refs: Ref[]): Seg => ({ t: "claim", s, refs });

export const QUESTION_1 = "Who does ALFA DEMO SRL sell to, and is it concentrated on one buyer?";
export const QUESTION_2 = "Search the web for news about ALFA DEMO SRL and the hospital.";

export const ANSWER_1: Extract<Message, { role: "assistant" }> = {
  role: "assistant",
  dataThrough: "2026-11-02",
  toolCalls: 4,
  blocks: [
    {
      type: "para",
      segs: [
        ent(ALFA),
        text(" "),
        claim("won 5,915,000 RON across 13 Records in SEAP, all but one of them in 2023", ALFA),
        text(". "),
        claim("Three buyers account for all of it", ALFA),
        text(": "),
        ent(SPITAL),
        text(" "),
        claim("with 5,525,000 RON over 11 Records (93% of the total)", SPITAL, R1, R2, R4),
        text(", "),
        ent(COMUNA),
        text(" "),
        claim("with 350,000 RON (1 Record)", COMUNA),
        text(" and "),
        ent(CNAIR),
        text(" "),
        claim("with 40,000 RON (1 Record)", CNAIR),
        text(". "),
        { t: "unverified", s: "It has supplied the hospital every year since 2019.", why: "No Record or entity the tools returned supports this; the earliest Record is from January 2023." },
      ],
    },
    {
      type: "caveat",
      segs: [
        claim("The total leaves out a framework-agreement ceiling of 10,000,000 RON (its subsequent contracts are counted instead)", R3),
        text(", "),
        claim("2 Records have no published value", R5, R6),
        text(", and "),
        claim("1 Record was left out as a suspect value", ALFA),
        text("."),
      ],
    },
    {
      type: "lead",
      refs: [SPITAL, R1, R2, R4],
      segs: [
        text("93% of ALFA DEMO SRL's SEAP money comes from one buyer, "),
        ent(SPITAL),
        text(", mostly through open tenders. Worth checking how many bids those tenders drew; the graph doesn't say."),
      ],
    },
  ],
};

export const ANSWER_2: Extract<Message, { role: "assistant" }> = {
  role: "assistant",
  dataThrough: "2026-11-02",
  toolCalls: 3,
  blocks: [
    {
      type: "outside",
      intro: "I searched the web for “ALFA DEMO SRL” together with “SPITALUL EXEMPLU”. Two pages mention them. These are Outside sources: they are not part of our data and I haven't matched anything in them to an entity.",
      segs: [],
      sources: [
        {
          url: "https://stiri-locale.example.ro/2024/03/spitalul-exemplu-licitatie",
          site: "stiri-locale.example.ro",
          title: "Spitalul Exemplu a atribuit contractul de echipamente",
          fetchedAt: "2026-11-26T10:42:00Z",
          excerpt: "„… contractul a fost câștigat de ALFA DEMO SRL, singurul ofertant care a depus documentația completă …”",
        },
        {
          url: "https://ziar-judetean.example.ro/economie/alfa-demo",
          site: "ziar-judetean.example.ro",
          title: "Firma clujeană care livrează aparatură medicală",
          fetchedAt: "2026-11-26T10:42:00Z",
          excerpt: "„ALFA DEMO SRL, cu sediul în Cluj, … furnizor pentru mai multe spitale din regiune …”",
        },
      ],
    },
    {
      type: "para",
      segs: [
        text("One article says ALFA DEMO SRL was the only complete bid on a hospital tender. Our data doesn't record bidder counts, so this can't be checked against "),
        ent(SPITAL),
        text("'s Records here."),
      ],
    },
  ],
};

export const CONVERSATION: Message[] = [{ role: "user", text: QUESTION_1 }, ANSWER_1];
export const PRIVATE_CONVERSATION: Message[] = [...CONVERSATION, { role: "user", text: QUESTION_2 }, ANSWER_2];

export const SUGGESTIONS = ["Which buyers pay ALFA DEMO SRL the most?", "Does ALFA DEMO SRL have any Signals?", "Who else won contracts with SPITALUL EXEMPLU?"];

/** Every distinct graph ref an answer cites, in first-cited order: the Sources list and the numbering use it. */
export function citedRefs(messages: Message[]): Ref[] {
  const seen = new Map<string, Ref>();
  const add = (r: Ref) => seen.set(refId(r), seen.get(refId(r)) ?? r);
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    for (const b of m.blocks) {
      for (const s of b.segs) {
        if (s.t === "claim") s.refs.forEach(add);
        if (s.t === "entity") add(s.ref);
      }
      if (b.type === "lead") b.refs.forEach(add);
    }
  }
  return [...seen.values()];
}

export function refId(r: Ref): string {
  return r.kind === "entity" ? `entity:${r.key}` : r.kind === "record" ? `record:${r.code}` : `signal:${r.rule}`;
}

export function refHref(r: Ref): string {
  if (r.kind === "entity") return `/explore/${r.role}/${r.key}`;
  if (r.kind === "record") return `/explore/record/${encodeURIComponent(r.code)}`;
  return r.href;
}

export function refLabel(r: Ref): string {
  return r.kind === "entity" ? r.name : r.kind === "record" ? r.code : r.label;
}

export type Tier = "public" | "private";
export type UiState = "answer" | "checking" | "empty" | "quota-low" | "quota-out" | "off";
export const STATES: readonly UiState[] = ["answer", "checking", "empty", "quota-low", "quota-out", "off"];
