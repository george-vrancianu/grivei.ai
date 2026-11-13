import { ToggleButton, ToggleButtonGroup, type Locale } from "@grivei/ui";
import type { Copy } from "../../copy/index.ts";
import { AppLink } from "../AppLink/index.ts";

export interface LanguageSwitchProps {
  copy: Copy["language"];
  /** The language the link leads to. */
  to: Locale;
  /** The current page in that language, query string included (see `switchLocalePath`). */
  href: string;
}

/**
 * The EN/RO switch, one segmented control like the lens and side toggles: the current language is the selected segment (a label),
 * the other a plain link to the same page in that language.
 */
export function LanguageSwitch({ copy, to, href }: LanguageSwitchProps) {
  const current = to === "ro" ? "en" : "ro";
  return (
    <ToggleButtonGroup>
      <ToggleButton component="span" role={undefined} tabIndex={-1} value={current} selected lang={current} aria-current="true">
        {copy.current}
      </ToggleButton>
      <ToggleButton component={AppLink} href={href} hrefLang={to} lang={to} aria-label={copy.switchLabel} data-testid="language-switch" underline="none" value={to}>
        {copy.switchTo}
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
