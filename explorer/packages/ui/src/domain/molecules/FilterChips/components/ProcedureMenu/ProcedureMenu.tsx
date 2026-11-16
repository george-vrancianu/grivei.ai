import type { FilterChipsCopy } from "../../filterChips.types.ts";
import { MultiChoiceMenu } from "../../../MultiChoiceMenu/index.ts";

export interface ProcedureMenuProps {
  /** Procedure names as SEAP publishes them (Romanian, in both languages). */
  procedures: readonly string[];
  selected: readonly string[] | null | undefined;
  onToggle: (procedure: string) => void;
  copy: FilterChipsCopy["procedure"];
  /** "Any" / "Oricare". */
  unsetLabel: string;
  picked: FilterChipsCopy["picked"];
  /** Start open (the workbench shows an open menu this way). */
  defaultOpen?: boolean;
}

/** Several procedures at once, one checkbox item each; names are shown as published, never translated. With none to offer, the menu's only line says so, disabled. */
export function ProcedureMenu({ procedures, selected, onToggle, copy, unsetLabel, picked, defaultOpen }: ProcedureMenuProps) {
  return (
    <MultiChoiceMenu
      label={copy.group}
      unsetLabel={unsetLabel}
      options={procedures.map((name) => ({ value: name, label: name }))}
      selected={selected}
      onToggle={onToggle}
      picked={picked}
      emptyText={copy.empty}
      defaultOpen={defaultOpen}
    />
  );
}
