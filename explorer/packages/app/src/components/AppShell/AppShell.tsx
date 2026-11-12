import type { ReactNode } from "react";
import { Box, Stack, Typography, type Locale } from "@grivei/ui";
import type { Copy } from "../../copy/index.ts";
import { AppLink } from "../AppLink/index.ts";
import { LanguageSwitch } from "../LanguageSwitch/index.ts";

export interface AppShellProps {
  copy: Pick<Copy, "brand" | "nav" | "language">;
  /** The other language and the current page in it. */
  switchTo: { locale: Locale; href: string };
  links: { explore: string; search: string; coverage: string; methodology: string };
  children: ReactNode;
}

/** The frame every page sits in: brand, main navigation, the EN/RO switch, then the page. */
export function AppShell({ copy, switchTo, links, children }: AppShellProps) {
  return (
    <>
      <Box component="header" sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={3} sx={{ alignItems: "center", maxWidth: 1200, mx: "auto" }}>
          <Typography variant="h6" component="p" sx={{ flexGrow: 0 }}>
            {copy.brand}
          </Typography>
          <Stack component="nav" aria-label={copy.nav.label} direction="row" spacing={2} sx={{ flexGrow: 1 }}>
            <AppLink href={links.explore}>{copy.nav.explore}</AppLink>
            <AppLink href={links.search}>{copy.nav.search}</AppLink>
            <AppLink href={links.coverage}>{copy.nav.coverage}</AppLink>
            <AppLink href={links.methodology}>{copy.nav.methodology}</AppLink>
          </Stack>
          <LanguageSwitch copy={copy.language} to={switchTo.locale} href={switchTo.href} />
        </Stack>
      </Box>
      {children}
    </>
  );
}
