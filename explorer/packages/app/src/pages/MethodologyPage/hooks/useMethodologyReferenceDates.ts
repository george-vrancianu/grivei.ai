import { useEffect, useState } from "react";
import type { MethodologyReferenceDates } from "@grivei/ui";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { MethodologyReferenceSources } from "../../../graphql/operations.ts";

/** Runs `MethodologyReferenceSources` once: the day AMEPIP's held list was published and the newest fiscal year of MF's statements and the newest year of BaniPartide's firm donations. Until it answers, and when it cannot, the date is absent and the prose stands alone. */
export function useMethodologyReferenceDates(): MethodologyReferenceDates {
  const client = useClient();
  const [dates, setDates] = useState<MethodologyReferenceDates>({ publicEnterprises: null, partyAndLeadership: null, financialStatements: null, firmDonations: null });

  useEffect(() => {
    const controller = new AbortController();
    client
      .query(MethodologyReferenceSources, {}, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setDates({
            publicEnterprises: data.referenceSources.find((s) => s.id === "AMEPIP")?.dataThrough ?? null,
            partyAndLeadership: data.referenceSources.find((s) => s.id === "AEP")?.dataThrough ?? null,
            financialStatements: data.referenceSources.find((s) => s.id === "FINANCIAL_STATEMENTS")?.fiscalYear ?? null,
            firmDonations: data.referenceSources.find((s) => s.id === "BANIPARTIDE")?.fiscalYear ?? null,
          });
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [client]);

  return dates;
}
