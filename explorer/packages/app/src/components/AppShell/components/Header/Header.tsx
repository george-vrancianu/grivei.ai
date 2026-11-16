import { Box, RequestBar, Typography, type Locale } from "@grivei/ui";
import type { Copy } from "../../../../copy/index.ts";
import logoUrl from "../../../../assets/logo-disc.svg";
import { AppLink } from "../../../AppLink/index.ts";
import { LanguageSwitch } from "../../../LanguageSwitch/index.ts";
import { headerSx } from "./header.utils.ts";

export type NavItem = "explore" | "search" | "coverage" | "methodology";

export interface HeaderProps {
  copy: Pick<Copy, "brand" | "nav" | "language">;
  /** The other language and the current page in it. */
  switchTo: { locale: Locale; href: string };
  links: Record<NavItem, string>;
  /** The nav item of the page being shown; null on a page that has none (the page is then not marked). */
  current: NavItem | null;
  /** Whether any request is in flight: shows the progress bar on the header edge (fixed at the viewport top below md). */
  busy?: boolean;
}

const NAV: readonly NavItem[] = ["explore", "search", "coverage", "methodology"];

/** The header of every page: the logo and brand (home), the main navigation with the current page marked, then the EN/RO switch. */
export function Header({ copy, switchTo, links, current, busy = false }: HeaderProps) {
  return (
    <Box
      component="header"
      sx={headerSx}
    >
      <RequestBar busy={busy} />
      <Box
        sx={(theme) => ({
          maxWidth: theme.graf.layout.maxWidth,
          mx: "auto",
          px: theme.graf.layout.gutter,
          py: 1.5,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px 32px",
        })}
      >
        <AppLink href={links.explore} underline="none" sx={(theme) => ({ display: "flex", alignItems: "center", gap: 1.5, color: theme.palette.text.primary, "&:hover": { color: theme.palette.text.primary } })}>
          <Box component="img" src={logoUrl} alt="" sx={(theme) => ({ display: "block", width: theme.graf.size.logo, height: theme.graf.size.logo, borderRadius: "50%", boxShadow: theme.graf.logoShadow })} />
          <Typography variant="button" component="span" sx={{ color: "inherit" }}>
            {copy.brand}
          </Typography>
        </AppLink>
        <Box component="nav" aria-label={copy.nav.label} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 28px" }}>
          {NAV.map((item) => (
            <AppLink
              key={item}
              href={links[item]}
              underline="none"
              {...(current === item ? { "aria-current": "page" as const } : {})}
              sx={(theme) => ({
                ...theme.typography.label,
                py: 1.5,
                color: theme.palette.text.secondary,
                "&:hover": { color: theme.palette.text.primary, textDecoration: "underline" },
                "&[aria-current='page']": { color: theme.palette.primary.main },
              })}
            >
              {copy.nav[item]}
            </AppLink>
          ))}
          <LanguageSwitch copy={copy.language} to={switchTo.locale} href={switchTo.href} />
        </Box>
      </Box>
    </Box>
  );
}
