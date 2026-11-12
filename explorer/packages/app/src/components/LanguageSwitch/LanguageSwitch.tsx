import type { Locale } from "@grivei/ui";
import type { Copy } from "../../copy/index.ts";
import { AppLink } from "../AppLink/index.ts";

export interface LanguageSwitchProps {
  copy: Copy["language"];
  /** The language the link leads to. */
  to: Locale;
  /** The current page in that language, query string included (see `switchLocalePath`). */
  href: string;
}

/** The EN/RO switch: one plain link to the same page in the other language. */
export function LanguageSwitch({ copy, to, href }: LanguageSwitchProps) {
  return (
    <AppLink href={href} hrefLang={to} lang={to} aria-label={copy.switchLabel} data-testid="language-switch">
      {copy.switchTo}
    </AppLink>
  );
}
