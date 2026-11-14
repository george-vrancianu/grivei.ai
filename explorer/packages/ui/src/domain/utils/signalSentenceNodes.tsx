import type { ReactNode } from "react";
import type { Locale } from "../../theme/index.ts";
import { MoneyAmount } from "../atoms/MoneyAmount/index.ts";
import type { SignalData } from "../types.ts";
import { signalNumberTexts, type SignalRulesCopy } from "./signalWording.ts";
import { withNodes } from "./withNodes.tsx";

/**
 * The Signal's sentence as visible text: word for word `signalSentence` (one catalogue string per rule and language), with each amount
 * in a `<MoneyAmount>` (the money variant). `signalSentence` stays the plain-string path (tooltip, accessible names, the wording guard).
 */
export function signalSentenceNodes(signal: Pick<SignalData, "numbers">, locale: Locale, rules: SignalRulesCopy): ReactNode {
  const { numbers } = signal;
  const money = (bani: string) => <MoneyAmount bani={bani} locale={locale} showBani />;
  const filled = signalNumberTexts(numbers, locale);
  // `filled.rule` narrows the texts but not `numbers`; the `__typename` guards below narrow the raw amounts for the money nodes. They cannot fail
  // (`signalNumberTexts` derives the rule from the same `__typename`) and replace a cast.
  switch (filled.rule) {
    case "OVER_CAP":
      if (numbers.__typename !== "OverCapNumbers") return null;
      return withNodes((value, cap) => rules.OVER_CAP.sentence({ ...filled.texts, value, cap }), [money(numbers.value), money(numbers.cap)]);
    case "SPLITTING":
      if (numbers.__typename !== "SplittingNumbers") return null;
      return withNodes((sum, cap) => rules.SPLITTING.sentence({ ...filled.texts, sum, cap }), [money(numbers.sum), money(numbers.cap)]);
    case "FRAMEWORK_OVERRUN":
      if (numbers.__typename !== "FrameworkOverrunNumbers") return null;
      return withNodes((ceiling, subsequent) => rules.FRAMEWORK_OVERRUN.sentence({ ...filled.texts, ceiling, subsequent }), [money(numbers.ceiling), money(numbers.subsequent)]);
    case "NO_PUBLICATION":
      return rules.NO_PUBLICATION.sentence(filled.texts);
    case "YOUNG_FIRM":
      return rules.YOUNG_FIRM.sentence(filled.texts);
    case "NO_CONSTRUCTION_CAEN":
      if (numbers.__typename !== "NoConstructionCaenNumbers") return null;
      return withNodes((value) => rules.NO_CONSTRUCTION_CAEN.sentence({ ...filled.texts, value }), [money(numbers.value)]);
    case "AFTER_STRIKE_OFF":
      return rules.AFTER_STRIKE_OFF.sentence(filled.texts);
    case "INSOLVENCY":
      return rules.INSOLVENCY.sentence(filled.texts);
    case "FEW_EMPLOYEES":
      if (numbers.__typename !== "FewEmployeesNumbers") return null;
      return withNodes((awarded) => rules.FEW_EMPLOYEES.sentence({ ...filled.texts, awarded }), [money(numbers.awarded)]);
    case "NO_FINANCIAL_STATEMENT":
      if (numbers.__typename !== "NoFinancialStatementNumbers") return null;
      return withNodes((awarded) => rules.NO_FINANCIAL_STATEMENT.sentence({ ...filled.texts, awarded }), [money(numbers.awarded)]);
  }
}
