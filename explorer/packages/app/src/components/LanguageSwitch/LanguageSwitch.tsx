import { Box, type Locale } from "@grivei/ui";
import type { Copy } from "../../copy/index.ts";
import { AppLink } from "../AppLink/index.ts";

export interface LanguageSwitchProps {
  copy: Copy["language"];
  /** The language the link leads to. */
  to: Locale;
  /** The current page in that language, query string included (see `switchLocalePath`). */
  href: string;
}

const segment = { display: "flex", alignItems: "center", minHeight: 36, px: 1.5, borderRadius: "3px" } as const;

/** The EN/RO switch: the current language marked, and one plain link to the same page in the other language. */
export function LanguageSwitch({ copy, to, href }: LanguageSwitchProps) {
  const current = to === "ro" ? "en" : "ro";
  return (
    <Box sx={(theme) => ({ display: "flex", gap: "2px", p: "2px", border: 1, borderColor: "divider", borderRadius: `${theme.graf.radius.control}px` })}>
      <Box component="span" lang={current} aria-current="true" sx={(theme) => ({ ...segment, ...theme.graf.states.selected, boxShadow: "none", fontFamily: theme.graf.font.mono, fontSize: 13 })}>
        {copy.current}
      </Box>
      <AppLink
        href={href}
        hrefLang={to}
        lang={to}
        aria-label={copy.switchLabel}
        data-testid="language-switch"
        underline="none"
        sx={(theme) => ({ ...segment, color: theme.palette.text.disabled, fontFamily: theme.graf.font.mono, fontSize: 13, "&:hover": theme.graf.states.hover, "&:active": theme.graf.states.pressed })}
      >
        {copy.switchTo}
      </AppLink>
    </Box>
  );
}
