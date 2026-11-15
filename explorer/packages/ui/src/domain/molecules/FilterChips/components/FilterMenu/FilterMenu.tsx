import { useId, type ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Button } from "../../../../../atoms/Button/index.ts";
import { Menu } from "../../../../../atoms/Menu/index.ts";
import { selected } from "../../../../../theme/states.ts";
import { color, radius } from "../../../../../theme/tokens.ts";
import { useMenuAnchor } from "./hooks/useMenuAnchor.ts";

export interface FilterMenuApi {
  /** Closes the menu and returns focus to its button; a single-choice menu calls it on a pick, a multi-select does not. */
  close: () => void;
}

export interface FilterMenuProps {
  /** The group name, in muted: "Channel". Also the menu's accessible name. */
  label: string;
  /** What is chosen, as text; `undefined` when the filter is unset (the button then shows `unsetLabel`, the outline is off). */
  value: string | undefined;
  /** "Any" / "Oricare". */
  unsetLabel: string;
  /** Start open (the workbench shows an open menu this way). */
  defaultOpen?: boolean;
  /**
   * The menu's contents. Direct children of MUI's list, no fragments: `MenuOption`s (single choice: `menuitemradio`, call `close` on a pick;
   * multi-select: `menuitemcheckbox`, stay open), or any other content, such as a two-column year picker. A function gets `close`.
   */
  children: ReactNode | ((menu: FilterMenuApi) => ReactNode);
}

/** A filter's button (group name, value, chevron) with its portalled overlay menu 8 px below, left-aligned. The owner holds the filter; this holds only open or closed. */
export function FilterMenu({ label, value, unsetLabel, defaultOpen = false, children }: FilterMenuProps) {
  const id = useId();
  const { anchor, setAnchor, open, toggle, close } = useMenuAnchor(defaultOpen);
  const set = value !== undefined;
  return (
    <>
      <Button
        id={id}
        ref={setAnchor}
        variant="outlined"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        onClick={toggle}
        sx={{
          gap: 1,
          padding: "0 12px 0 14px",
          borderRadius: `${radius.menuButton}px`,
          fontWeight: 400,
          textTransform: "none",
          whiteSpace: "nowrap",
          ...(set && selected),
          "&[aria-expanded='true']": { backgroundColor: color.line },
        }}
      >
        <Box component="span" sx={{ color: color.muted }}>{label}</Box>
        <Box component="span" sx={{ color: set ? color.text : color.text2 }}>{value ?? unsetLabel}</Box>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </Button>
      <Menu
        id={`${id}-menu`}
        open={open}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ list: { "aria-labelledby": id } }}
      >
        {typeof children === "function" ? children({ close }) : children}
      </Menu>
    </>
  );
}
