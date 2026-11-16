import type { SourcePickerOption } from "./sourcePicker.types.ts";

/** An option's text: the Source's name, with its count when there is one ("SEAP · 1,204 Records"). */
export const optionText = (option: SourcePickerOption): string => (option.count === undefined ? option.label : `${option.label} · ${option.count}`);
