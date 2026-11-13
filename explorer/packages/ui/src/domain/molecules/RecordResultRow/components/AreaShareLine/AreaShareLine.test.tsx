import { renderInUi } from "../../../../../testing/render.tsx";
import { formatMoney } from "../../../../atoms/MoneyAmount/moneyAmount.utils.ts";
import { sampleCopy } from "../../../../samples/copy.ts";
import { AreaShareLine } from "./index.ts";

describe("AreaShareLine", () => {
  it.each(["en", "ro"] as const)("labels the in-county share as the equal-share convention (%s)", (locale) => {
    const { container } = renderInUi(<AreaShareLine bani="1500000000" locale={locale} copy={sampleCopy.recordRow(locale)} />, locale);
    const amount = formatMoney("1500000000", locale, { showBani: true });
    expect(container.querySelector("[data-area-share]")?.textContent).toBe(sampleCopy.recordRow(locale).areaShare(amount));
  });
});
