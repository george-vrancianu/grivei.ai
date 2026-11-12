// Small constructors for the shared fragments, so fixtures read as scenarios.
// Every builder returns the complete fragment shape; the invented data below is
// fictional (names and CUIs do not belong to real entities), except the Romanian
// institution types and procedure names, which are as SEAP publishes them.
import type {
  DataThroughFieldsFragment, EntityHeaderFieldsFragment, EntityRefFragment, EntityRowFieldsFragment,
  MoneyMapFieldsFragment, PartyFieldsFragment, RecordRowFieldsFragment, SignalFieldsFragment,
  TotalFieldsFragment,
} from "../generated/operations.ts";

/** RON to bani as a decimal string. */
export const ron = (amount: number | bigint): string => (BigInt(amount) * 100n).toString();

export const total = (o: Partial<TotalFieldsFragment> = {}): TotalFieldsFragment => ({
  awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false, ...o,
});

export const zeroTotal = total();

export const entityRef = (key: string, displayName: string, identity: EntityRefFragment["identity"] = "CUI"): EntityRefFragment => ({
  key, displayName, identity,
});

type Placement = NonNullable<EntityRowFieldsFragment["placement"]>;
export const placeInCounty = (code: string, name: string, uat?: [string, string]): Placement => ({
  county: { code, name }, uat: uat ? { siruta: uat[0], name: uat[1] } : null, national: false, placedBy: "ANAF",
});
export const placeNational: Placement = { county: null, uat: null, national: true, placedBy: "ANAF" };

export const entityRow = (ref: EntityRefFragment, placement: EntityRowFieldsFragment["placement"], anafStatus: string | null = "ACTIV"): EntityRowFieldsFragment => ({
  ...ref, anafStatus, placement,
});

/** The ANAF provenance every entity header is traced to. */
export const anafProvenance: EntityHeaderFieldsFragment["provenance"][number] = {
  source: "ANAF", url: null, via: null, kind: "API", fetchedAt: "2024-10-01T05:00:00Z",
};

/** What a name-only supplier is traced to: ANAF has no answer for it, so SEAP's own entity endpoint. */
export const seapProvenance: EntityHeaderFieldsFragment["provenance"][number] = {
  source: "SEAP", url: null, via: null, kind: "API", fetchedAt: "2024-10-01T05:00:00Z",
};

export const entityHeader = (
  row: EntityRowFieldsFragment,
  o: Partial<Omit<EntityHeaderFieldsFragment, keyof EntityRowFieldsFragment>> = {},
): EntityHeaderFieldsFragment => ({
  ...row,
  cui: row.identity === "CUI" ? row.key : null,
  foreignVatId: null,
  identityCurated: false,
  aliases: [],
  provenance: [anafProvenance],
  seap: { roles: ["SUPPLIER"] },
  ...o,
});

export const party = (ref: EntityRefFragment | null, o: Partial<PartyFieldsFragment> = {}): PartyFieldsFragment => ({
  naturalPerson: ref === null, publishedName: ref?.displayName ?? null, share: null, entity: ref, ...o,
});

export const record = (o: Partial<RecordRowFieldsFragment> & Pick<RecordRowFieldsFragment, "code" | "title" | "authority" | "winners">): RecordRowFieldsFragment => ({
  date: "2024-03-14", kind: "DA", channel: "DIRECT_PURCHASE", procedure: null,
  value: null, counted: null, badges: [], signals: [], ...o,
});

export const dataThrough = (o: Partial<DataThroughFieldsFragment> & Pick<DataThroughFieldsFragment, "id" | "name">): DataThroughFieldsFragment => ({
  harvested: false, dataThrough: [], ...o,
});

export const moneyMap = (o: Partial<MoneyMapFieldsFragment> = {}): MoneyMapFieldsFragment => ({
  side: "AUTHORITY", counties: [], national: zeroTotal, unplaced: null, unknownSupplierCounty: null, ...o,
});

export const reproduce = (o: Partial<SignalFieldsFragment["reproduce"]>): SignalFieldsFragment["reproduce"] => ({
  authority: null, supplier: null, signal: null, cpv: null, from: null, to: null, ...o,
});
