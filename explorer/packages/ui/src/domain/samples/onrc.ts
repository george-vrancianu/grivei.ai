import type { OnrcRegistrationData } from "../types.ts";

const provenance = { source: "ONRC" as const, url: "https://data.gov.ro/dataset/firme-06-05-2026", via: "Firme înregistrate la Registrul Comerțului până la data de 06.05.2026", kind: "BULK" as const, fetchedAt: "2026-11-13T04:00:00Z" };

/** A registration with a status change (insolvency first seen after the first snapshot), a status already in the earliest snapshot, CAEN codes, a rename. Invented. */
export const onrcRegistration: OnrcRegistrationData = {
  registrationNumber: "J40/1001/2015",
  registrationDate: "2015-03-10",
  legalForm: "SRL",
  statuses: [
    { code: 1048, name: "funcțiune", firstSeen: "2025-03-18", sinceAtLeast: true },
    { code: 1107, name: "insolvență", firstSeen: "2026-04-03", sinceAtLeast: false },
  ],
  caen: [{ code: "4120", version: 2 }, { code: "4211", version: 2 }],
  seat: { county: "Cluj", locality: "Cluj-Napoca", address: "Cluj-Napoca, Str. EXEMPLU, Nr. 1, Cod postal 400001", postalCode: "400001" },
  aliases: [
    { name: "ALFA NOU SRL", firstSeen: "2026-04-03", lastSeen: "2026-05-06", sinceAtLeast: false, current: true },
    { name: "ALFA VECHI SRL", firstSeen: "2025-03-18", lastSeen: "2026-03-02", sinceAtLeast: true, current: false },
  ],
  snapshot: "2026-05-06",
  provenance,
};

/** The legacy layout carries no registration date and no CAEN codes; the status is unnamed in the held nomenclature; no seat. */
export const onrcRegistrationSparse: OnrcRegistrationData = {
  registrationNumber: "J99/1008/2021",
  registrationDate: null,
  legalForm: null,
  statuses: [{ code: 2110, name: null, firstSeen: "2026-03-02", sinceAtLeast: false }],
  caen: [],
  seat: { county: null, locality: null, address: null, postalCode: null },
  aliases: [{ name: "ZETA FARA JUDET SRL", firstSeen: "2026-03-02", lastSeen: "2026-03-02", sinceAtLeast: false, current: true }],
  snapshot: "2026-03-02",
  provenance: { ...provenance, url: null },
};
