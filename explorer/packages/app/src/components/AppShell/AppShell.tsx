import type { ReactNode } from "react";
import { Box, type Locale } from "@grivei/ui";
import type { Copy } from "../../copy/index.ts";
import { Footer } from "./components/Footer/index.ts";
import { Header, type NavItem } from "./components/Header/index.ts";

export interface AppShellProps {
  copy: Pick<Copy, "brand" | "nav" | "language" | "footer">;
  /** The other language and the current page in it. */
  switchTo: { locale: Locale; href: string };
  links: Record<NavItem, string>;
  /** The nav item of the page shown, if it has one. */
  current: NavItem | null;
  children: ReactNode;
}

/** The frame every page sits in, on the dot grid: header (logo, navigation, EN/RO), the page, then the footer. */
export function AppShell({ copy, switchTo, links, current, children }: AppShellProps) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header copy={copy} switchTo={switchTo} links={links} current={current} />
      <Box sx={{ flex: "1 0 auto" }}>{children}</Box>
      <Footer copy={copy.footer} />
    </Box>
  );
}
