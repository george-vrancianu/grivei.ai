import { useEffect, useState } from "react";
import type { MethodologyBaseRates } from "@grivei/ui";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { MethodologyBaseRates as MethodologyBaseRatesOperation } from "../../../graphql/operations.ts";

/** Runs the `MethodologyBaseRates` query once: each Signal rule's window and national base rate. A failure is a state, never a thrown error: the prose does not depend on it. */
export function useMethodologyBaseRates(): MethodologyBaseRates {
  const client = useClient();
  const [state, setState] = useState<MethodologyBaseRates>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    client
      .query(MethodologyBaseRatesOperation, {}, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: "ready", rules: data.signalRules });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [client]);

  return state;
}
