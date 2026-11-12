import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { UiProvider } from "../UiProvider/index.ts";
import type { Locale } from "../theme/index.ts";

export function renderInUi(ui: ReactElement, locale: Locale = "en") {
  return render(ui, { wrapper: ({ children }) => <UiProvider locale={locale}>{children}</UiProvider> });
}
