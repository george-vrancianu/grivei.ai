// The invented world every fixture draws from: a few entities, Records and Signals
// that between them show every state the screens must handle. Keys, CUIs and
// codes are made up. SEAP's own vocabulary (procedure names, CPV, document kinds) is real.
import type { SignalBadgeFieldsFragment, SignalFieldsFragment } from "../generated/operations.ts";
import {
  dataThrough, seapProvenance, entityHeader, entityRef, entityRow, party, placeInCounty, placeNational, record, reproduce, ron,
} from "./builders.ts";

// ---- sources (the same data-through dates on every screen) ----------------

export const sources = [
  dataThrough({
    id: "SEAP", name: "SEAP", harvested: true,
    dataThrough: [
      { kind: "DA", date: "2024-09-30" }, { kind: "DAN", date: "2024-09-30" },
      { kind: "CONTRACT", date: "2024-09-30" }, { kind: "AWARD_NOTICE", date: "2024-11-30" },
    ],
  }),
  dataThrough({ id: "ONRC", name: "ONRC" }),
  dataThrough({ id: "ANI", name: "ANI" }),
  dataThrough({ id: "MFINANTE", name: "Ministerul Finanțelor" }),
  dataThrough({ id: "JUST", name: "portal.just.ro" }),
];

// ---- entities ------------------------------------------------------------

export const primariaBrasov = entityRef("4000001", "MUNICIPIUL BRAȘOV");
export const primariaBrasovRow = entityRow(primariaBrasov, placeInCounty("RO-BV", "Brașov", ["40198", "Brașov"]));

export const drumuriNationale = entityRef("4000002", "COMPANIA NAȚIONALĂ DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A.");
export const drumuriNationaleRow = entityRow(drumuriNationale, placeNational);

export const spitalSibiu = entityRef("4000003", "SPITALUL CLINIC JUDEȚEAN DE URGENȚĂ SIBIU");
export const spitalSibiuRow = entityRow(spitalSibiu, placeInCounty("RO-SB", "Sibiu", ["143450", "Sibiu"]));

export const primariaFaraUat = entityRef("4000004", "CONSILIUL LOCAL (LOCALITATE NECUNOSCUTĂ)");
export const primariaFaraUatRow = entityRow(primariaFaraUat, { county: { code: "RO-BV", name: "Brașov" }, uat: null, national: false, placedBy: "SEAP" });

export const autoritateNeplasata = entityRef("4000005", "ASOCIAȚIA INTERCOMUNITARĂ EXEMPLU");
export const autoritateNeplasataRow = entityRow(autoritateNeplasata, null, null);

export const hachi = entityRef("30000001", "HACHI INVEST S.R.L.");
export const hachiRow = entityRow(hachi, placeInCounty("RO-BV", "Brașov", ["40198", "Brașov"]));
export const hachiHeader = entityHeader(hachiRow, {
  aliases: [
    { name: "SC HACHI INVEST S.R.L.", records: 41, first: "2021-02-03", last: "2023-08-30", differsFromAnaf: false },
    { name: "HACHI INVEST SRL", records: 7, first: "2023-09-12", last: "2024-06-01", differsFromAnaf: false },
    { name: "HACHI INVEST ROMANIA S.R.L.", records: 1, first: "2022-05-05", last: "2022-05-05", differsFromAnaf: true },
  ],
});

export const constructii = entityRef("30000002", "CONSTRUCȚII TRANSILVANIA S.A.");
export const constructiiRow = entityRow(constructii, placeInCounty("RO-CJ", "Cluj", ["54975", "Cluj-Napoca"]));

export const constructiiHeader = entityHeader(constructiiRow, {
  aliases: [
    { name: "CONSTRUCȚII TRANSILVANIA S.A.", records: 38, first: "2021-01-12", last: "2024-10-30", differsFromAnaf: false },
    { name: "CONSTRUCTII TRANSILVANIA SA", records: 21, first: "2021-03-02", last: "2023-12-14", differsFromAnaf: false },
    { name: "S.C. CONSTRUCȚII TRANSILVANIA S.A.", records: 17, first: "2021-02-18", last: "2022-09-27", differsFromAnaf: false },
    { name: "CONSTRUCTII TRANSILVANIA S.A. CLUJ-NAPOCA", records: 9, first: "2022-04-05", last: "2024-06-19", differsFromAnaf: true },
    { name: "TRANSILVANIA CONSTRUCTII", records: 6, first: "2021-07-21", last: "2023-01-30", differsFromAnaf: true },
    { name: "CONSTRUCȚII TRANSILVANIA", records: 4, first: "2023-02-08", last: "2023-11-02", differsFromAnaf: true },
    { name: "CONSTR. TRANSILVANIA S.A.", records: 2, first: "2022-08-16", last: "2022-08-17", differsFromAnaf: true },
    { name: "TRANSILVANIA CONSTRUCTII SA (ASOCIERE)", records: 1, first: "2024-05-21", last: "2024-05-21", differsFromAnaf: true },
  ],
});

export const drumarii = entityRef("30000003", "DRUMARII UNIȚI S.R.L.");
export const drumariiRow = entityRow(drumarii, placeInCounty("RO-MS", "Mureș", ["114319", "Târgu Mureș"]), "RADIERE");

export const foreignFirm = entityRef("vat-DE811128135", "MEDTECH GMBH", "NAME_ONLY");
export const foreignFirmRow = entityRow(foreignFirm, null, null);
export const foreignFirmHeader = entityHeader(foreignFirmRow, {
  cui: null, foreignVatId: "DE811128135", provenance: [seapProvenance], aliases: [{ name: "MEDTECH GMBH", records: 3, first: "2022-11-01", last: "2024-02-20", differsFromAnaf: false }],
});

export const asociere = entityRef("name-asociere-alfa-beta", "ASOCIEREA ALFA - BETA", "NAME_ONLY");

export const cnairHeader = entityHeader(drumuriNationaleRow, {
  identityCurated: true,
  aliases: [{ name: "CNAIR S.A.", records: 120, first: "2021-01-05", last: "2024-11-30", differsFromAnaf: true }],
  seap: { roles: ["AUTHORITY", "SUPPLIER"] },
});
export const autoritateNeplasataHeader = entityHeader(autoritateNeplasataRow, { seap: { roles: ["AUTHORITY"] } });
export const primariaBrasovHeader = entityHeader(primariaBrasovRow, { seap: { roles: ["AUTHORITY"] } });
export const drumariiHeader = entityHeader(drumariiRow, {
  aliases: [{ name: "DRUMARII UNITI SRL", records: 9, first: "2021-04-01", last: "2022-12-15", differsFromAnaf: false }],
});

// ---- signals (one per rule) ----------------------------------------------

export const sOverCap: SignalFieldsFragment = {
  rule: "OVER_CAP", date: "2024-01-19", firstDate: "2024-01-19", recordCount: 1, dataThrough: "2024-11-30",
  authority: primariaBrasov, suppliers: [hachi],
  numbers: { __typename: "OverCapNumbers", value: ron(300_000), cap: ron(270_120), multiple: 1.11 },
  reproduce: reproduce({ authority: "4000001", supplier: "30000001", signal: "OVER_CAP", from: "2024-01-19", to: "2024-01-19" }),
};
export const sSplitting: SignalFieldsFragment = {
  rule: "SPLITTING", date: "2024-07-19", firstDate: "2024-07-01", recordCount: 2, dataThrough: "2024-11-30",
  authority: primariaBrasov, suppliers: [hachi],
  numbers: { __typename: "SplittingNumbers", purchases: 2, sum: ron(290_000), cap: ron(270_120), cpvGroup: "770", from: "2024-07-01", to: "2024-07-19" },
  reproduce: reproduce({ authority: "4000001", supplier: "30000001", signal: "SPLITTING", cpv: "770", from: "2024-07-01", to: "2024-07-19" }),
};
export const sFrameworkOverrun: SignalFieldsFragment = {
  rule: "FRAMEWORK_OVERRUN", date: "2024-03-12", firstDate: "2022-06-30", recordCount: 13, dataThrough: "2024-11-30",
  authority: drumuriNationale, suppliers: [drumarii],
  numbers: { __typename: "FrameworkOverrunNumbers", ceiling: ron(100_000_000), subsequent: ron(112_400_000), ratio: 1.124 },
  reproduce: reproduce({ authority: "4000002", supplier: "30000003", signal: "FRAMEWORK_OVERRUN" }),
};
export const sNoPublication: SignalFieldsFragment = {
  rule: "NO_PUBLICATION", date: "2023-12-01", firstDate: "2023-12-01", recordCount: 1, dataThrough: "2024-11-30",
  authority: spitalSibiu, suppliers: [foreignFirm],
  numbers: { __typename: "NoPublicationNumbers", procedure: "Negociere fără publicare prealabilă" },
  reproduce: reproduce({ authority: "4000003", supplier: "vat-DE811128135", signal: "NO_PUBLICATION", from: "2023-12-01", to: "2023-12-01" }),
};

// The ONRC and financial-statement rules (#184): each Signal names the facts of the Reference source it read in its `numbers`.
export const sYoungFirm: SignalFieldsFragment = {
  rule: "YOUNG_FIRM", date: "2024-05-30", firstDate: "2024-05-30", recordCount: 1, dataThrough: "2024-11-30",
  authority: primariaBrasov, suppliers: [constructii],
  numbers: { __typename: "YoungFirmNumbers", days: 90, registered: "2024-03-01", counted: ron(300_000) },
  reproduce: reproduce({ authority: "4000001", signal: "YOUNG_FIRM", from: "2024-05-30", to: "2024-05-30" }),
};
export const sNoConstructionCaen: SignalFieldsFragment = {
  rule: "NO_CONSTRUCTION_CAEN", date: "2024-04-10", firstDate: "2024-04-10", recordCount: 1, dataThrough: "2024-11-30",
  authority: primariaBrasov, suppliers: [hachi],
  numbers: { __typename: "NoConstructionCaenNumbers", value: ron(2_000_000), authorisedCodes: 3 },
  reproduce: reproduce({ authority: "4000001", signal: "NO_CONSTRUCTION_CAEN", from: "2024-04-10", to: "2024-04-10" }),
};
export const sAfterStrikeOff: SignalFieldsFragment = {
  rule: "AFTER_STRIKE_OFF", date: "2024-06-01", firstDate: "2024-06-01", recordCount: 1, dataThrough: "2024-11-30",
  authority: drumuriNationale, suppliers: [drumarii],
  numbers: { __typename: "AfterStrikeOffNumbers", struckOff: "2022-10-11", daysAfter: 599 },
  reproduce: reproduce({ authority: "4000002", signal: "AFTER_STRIKE_OFF", from: "2024-06-01", to: "2024-06-01" }),
};
export const sInsolvency: SignalFieldsFragment = {
  rule: "INSOLVENCY", date: "2024-10-15", firstDate: "2024-10-15", recordCount: 1, dataThrough: "2024-11-30",
  authority: spitalSibiu, suppliers: [constructii],
  numbers: { __typename: "InsolvencyNumbers", status: "insolvență", firstSeen: "2024-09-02", sinceAtLeast: false },
  reproduce: reproduce({ authority: "4000003", signal: "INSOLVENCY", from: "2024-10-15", to: "2024-10-15" }),
};
export const sFewEmployees: SignalFieldsFragment = {
  rule: "FEW_EMPLOYEES", date: "2023-09-12", firstDate: "2023-09-12", recordCount: 1, dataThrough: "2024-11-30",
  authority: primariaBrasov, suppliers: [hachi],
  numbers: { __typename: "FewEmployeesNumbers", fiscalYear: 2023, employees: 1, awarded: ron(5_400_000) },
  reproduce: reproduce({ authority: "4000001", signal: "FEW_EMPLOYEES", from: "2023-09-12", to: "2023-09-12" }),
};
export const sNoFinancialStatement: SignalFieldsFragment = {
  rule: "NO_FINANCIAL_STATEMENT", date: "2023-11-08", firstDate: "2023-11-08", recordCount: 1, dataThrough: "2024-11-30",
  authority: primariaBrasov, suppliers: [constructii],
  numbers: { __typename: "NoFinancialStatementNumbers", fiscalYear: 2023, awarded: ron(12_800_000), legalForm: "SA" },
  reproduce: reproduce({ authority: "4000001", signal: "NO_FINANCIAL_STATEMENT", from: "2023-11-08", to: "2023-11-08" }),
};
export const sDonorToParty: SignalFieldsFragment = {
  rule: "DONOR_TO_PARTY", date: "2023-11-20", firstDate: "2023-11-20", recordCount: 1, dataThrough: "2024-11-30",
  authority: primariaBrasov, suppliers: [constructii],
  numbers: { __typename: "DonorToPartyNumbers", days: 112, party: "PARTIDUL SOCIAL DEMOCRAT", derived: false, kind: "DONATION" },
  reproduce: reproduce({ authority: "4000001", signal: "DONOR_TO_PARTY", from: "2023-11-20", to: "2023-11-20" }),
};
/** Restricted: only served when the host shows Restricted content. */
export const sSoeBoardInSupplier: SignalFieldsFragment = {
  rule: "SOE_BOARD_IN_SUPPLIER", date: "2023-11-21", firstDate: "2023-11-21", recordCount: 1, dataThrough: "2024-11-30",
  authority: primariaBrasov, suppliers: [constructii],
  numbers: { __typename: "SoeBoardInSupplierNumbers", persons: 1 },
  reproduce: reproduce({ authority: "4000001", signal: "SOE_BOARD_IN_SUPPLIER", from: "2023-11-21", to: "2023-11-21" }),
};

/** A Signal as a Record's row carries it: rule, date, numbers and reproducing filter. */
export const signalBadge = ({ rule, date, numbers, reproduce: r }: SignalFieldsFragment): SignalBadgeFieldsFragment => ({ rule, date, numbers, reproduce: r });

// ---- records -------------------------------------------------------------

export const rDirect = record({
  code: "DA12345678", title: "Deszăpezire străzi, sezon rece 2023-2024", date: "2024-01-19", kind: "DA",
  channel: "DIRECT_PURCHASE", procedure: "Achiziție directă", value: ron(300_000), counted: ron(300_000),
  authority: primariaBrasov, winners: [party(hachi)], signals: [signalBadge(sOverCap)],
});
export const rDirectSmall = record({
  code: "DA12340001", title: "Consumabile birotică", date: "2024-02-02", value: ron(8_400), counted: ron(8_400),
  procedure: "Achiziție directă", authority: primariaBrasov, winners: [party(hachi)],
});
export const rContract = record({
  code: "CAN1166685", title: "Modernizare străzi, cartier Noua", date: "2023-11-08", kind: "CONTRACT", channel: "CONTRACT",
  procedure: "Licitație deschisă", value: ron(12_800_000), counted: ron(12_800_000),
  authority: primariaBrasov, winners: [party(constructii)],
});
export const rConsortium = record({
  code: "CAN1170001", title: "Reabilitare pod peste râul Olt", date: "2024-05-21", kind: "CONTRACT", channel: "CONTRACT",
  procedure: "Licitație deschisă", value: ron(30_000_000), counted: ron(30_000_000), badges: ["CONSORTIUM_SHARE"],
  authority: drumuriNationale,
  winners: [party(constructii, { share: ron(15_000_000) }), party(drumarii, { share: ron(15_000_000) })],
});
export const rConsortiumNameOnly = record({
  code: "CAN1170002", title: "Furnizare echipamente imagistice", date: "2024-02-27", kind: "CONTRACT", channel: "CONTRACT",
  procedure: "Licitație deschisă", value: ron(4_500_000), counted: ron(4_500_000), badges: ["CONSORTIUM_SHARE"],
  authority: spitalSibiu,
  winners: [party(foreignFirm, { share: ron(2_250_000) }), party(asociere, { share: ron(2_250_000) })],
});
export const rFrameworkCeiling = record({
  code: "CAN1160100", title: "Acord-cadru lucrări de întreținere drumuri naționale", date: "2022-06-30", kind: "CONTRACT",
  channel: "CONTRACT", procedure: "Licitație deschisă", value: ron(100_000_000), counted: null, badges: ["FRAMEWORK_CEILING"],
  authority: drumuriNationale, winners: [party(drumarii)],
});
export const rSubsequent = record({
  code: "CAN1180042", title: "Contract subsecvent nr. 7: întreținere DN 1", date: "2024-03-12", kind: "CONTRACT", channel: "CONTRACT",
  procedure: "Cu acord-cadru subsecvent", value: ron(9_300_000), counted: ron(9_300_000), badges: ["SUBSEQUENT_CONTRACT"],
  authority: drumuriNationale, winners: [party(drumarii)],
});
export const rSuspect = record({
  code: "DA12399999", title: "Servicii de curățenie", date: "2024-04-04", kind: "DA", channel: "DIRECT_PURCHASE",
  procedure: "Achiziție directă", value: ron(2_950_000_000), counted: null, badges: ["SUSPECT_VALUE"],
  authority: primariaFaraUat, winners: [party(hachi)],
});
export const rNoValue = record({
  code: "SCNA700123", title: "Anunț de atribuire fără valoare publicată", date: "2023-12-01", kind: "AWARD_NOTICE", channel: "CONTRACT",
  procedure: "Negociere fără publicare prealabilă", value: null, counted: null, badges: ["NO_VALUE"],
  authority: spitalSibiu, winners: [party(foreignFirm)], signals: [signalBadge(sNoPublication)],
});
export const rNaturalPerson = record({
  code: "DA12350005", title: "Servicii de consultanță juridică", date: "2024-06-10", value: ron(36_000), counted: ron(36_000),
  procedure: "Achiziție directă", authority: primariaFaraUat, winners: [party(null)],
});
export const rProvisional = record({
  code: "CAN1190777", title: "Livrare combustibil, trimestrul curent", date: "2024-11-20", kind: "AWARD_NOTICE", channel: "CONTRACT",
  procedure: "Procedură simplificată", value: ron(650_000), counted: ron(650_000), badges: ["CRAWLED_PROVISIONAL"],
  authority: spitalSibiu, winners: [party(constructii)],
});
export const rMismatch = record({
  code: "DA12360010", title: "Reparații clădire administrativă", date: "2023-07-07", value: ron(95_000), counted: ron(95_000),
  procedure: "Achiziție directă", badges: ["CUI_MISMATCH", "NAME_DIFFERS_FROM_ANAF", "CRAWL_ONLY", "IDENTITY_CURATED"],
  authority: primariaBrasov, winners: [party(primariaBrasov)],
});
export const rSplit1 = record({
  code: "DA12370001", title: "Servicii de întreținere spații verzi (1)", date: "2024-07-01", value: ron(150_000), counted: ron(150_000),
  procedure: "Achiziție directă", authority: primariaBrasov, winners: [party(hachi)], signals: [signalBadge(sSplitting)],
});
export const rSplit2 = record({
  code: "DA12370002", title: "Servicii de întreținere spații verzi (2)", date: "2024-07-19", value: ron(140_000), counted: ron(140_000),
  procedure: "Achiziție directă", authority: primariaBrasov, winners: [party(hachi)], signals: [signalBadge(sSplitting)],
});
