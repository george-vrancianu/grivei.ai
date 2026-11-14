import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { size } from "../../../theme/tokens.ts";
import { SearchBar } from "./index.ts";

const en = sampleCopy.searchBar("en");

function setup(props: Partial<React.ComponentProps<typeof SearchBar>> = {}) {
  const onQueryChange = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const view = renderInUi(<SearchBar value="" onQueryChange={onQueryChange} copy={en} {...props} />);
  return { onQueryChange, user, ...view };
}
const box = () => screen.getByRole("searchbox", { name: "Search" });

// Testing Library drains fake timers only when it finds `jest`; vitest has none, so hand it the one call it makes.
beforeEach(() => {
  vi.stubGlobal("jest", { advanceTimersByTime: vi.advanceTimersByTime });
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.getElementById("eyebrow")?.remove();
});

describe("SearchBar", () => {
  it("describes the box by its hint, then by the element it is told about", () => {
    setup({ describedBy: "eyebrow" });
    const eyebrow = document.createElement("p");
    eyebrow.id = "eyebrow";
    eyebrow.textContent = "Source: SEAP";
    document.body.append(eyebrow);
    expect(box()).toHaveAccessibleDescription(`${en.hint} Source: SEAP`);
  });

  it("emits ONE query after a burst of keystrokes, once typing pauses", async () => {
    const { user, onQueryChange } = setup();
    await user.type(box(), "deszăpezire");
    expect(onQueryChange).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(249));
    expect(onQueryChange).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange).toHaveBeenCalledWith("deszăpezire");
  });

  it("emits nothing for one character, and shows a quiet hint", async () => {
    const { user, onQueryChange } = setup();
    await user.type(box(), "d");
    act(() => void vi.advanceTimersByTime(1000));
    expect(onQueryChange).not.toHaveBeenCalled();
    expect(screen.getByText(en.minLengthHint)).toBeVisible();
  });

  it("emits the trimmed query", async () => {
    const { user, onQueryChange } = setup();
    await user.type(box(), "  pod ");
    act(() => void vi.advanceTimersByTime(250));
    expect(onQueryChange).toHaveBeenCalledExactlyOnceWith("pod");
  });

  it("emits the empty query at once when the clear button is pressed, and keeps focus in the input", async () => {
    const { user, onQueryChange } = setup({ value: "pod" });
    expect(box()).toHaveValue("pod");
    await user.click(screen.getByRole("button", { name: en.clear }));
    expect(onQueryChange).toHaveBeenCalledExactlyOnceWith("");
    expect(box()).toHaveValue("");
    expect(box()).toHaveFocus();
    expect(screen.queryByRole("button", { name: en.clear })).toBeNull();
  });

  it("clears with Escape", async () => {
    const { user, onQueryChange } = setup({ value: "pod" });
    await user.click(box());
    await user.keyboard("{Escape}");
    expect(onQueryChange).toHaveBeenCalledExactlyOnceWith("");
  });

  it("emits the empty query after the debounce when the text is deleted", async () => {
    const { user, onQueryChange } = setup({ value: "ab" });
    await user.clear(box());
    expect(onQueryChange).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(250));
    expect(onQueryChange).toHaveBeenCalledExactlyOnceWith("");
  });

  it("does not emit the same query twice", async () => {
    const { user, onQueryChange } = setup({ value: "pod" });
    await user.type(box(), "x");
    await user.type(box(), "{Backspace}");
    act(() => void vi.advanceTimersByTime(250));
    expect(onQueryChange).not.toHaveBeenCalled(); // back to the committed "pod"
  });

  it("does not emit a pending query after an external change replaced the text", async () => {
    const { user, onQueryChange, rerender } = setup();
    await user.type(box(), "abc");
    rerender(<SearchBar value="xyz" onQueryChange={onQueryChange} copy={en} />);
    act(() => void vi.advanceTimersByTime(500));
    expect(onQueryChange).not.toHaveBeenCalled();
    expect(box()).toHaveValue("xyz");
  });

  it("syncs the input when the value changes from outside", () => {
    const { rerender, onQueryChange } = setup({ value: "pod" });
    rerender(<SearchBar value="" onQueryChange={onQueryChange} copy={en} />);
    expect(box()).toHaveValue("");
    rerender(<SearchBar value="școală" onQueryChange={onQueryChange} copy={en} />);
    expect(box()).toHaveValue("școală");
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it("keeps a trailing space while the committed value echoes back", async () => {
    function Controlled() {
      const [q, setQ] = useState("");
      return <SearchBar value={q} onQueryChange={setQ} copy={en} />;
    }
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderInUi(<Controlled />);
    await user.type(box(), "pod ");
    act(() => void vi.advanceTimersByTime(250));
    expect(box()).toHaveValue("pod ");
  });

  it("shows a busy indicator and aria-busy while loading", () => {
    setup({ loading: true });
    expect(screen.getByRole("progressbar", { name: en.loading })).toBeVisible();
    expect(screen.getByRole("search")).toHaveAttribute("aria-busy", "true");
  });

  it("is not busy by default", () => {
    setup();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByRole("search")).toHaveAttribute("aria-busy", "false");
  });

  it("honours debounceMs and minLength", async () => {
    const { user, onQueryChange } = setup({ debounceMs: 50, minLength: 3 });
    await user.type(box(), "ab");
    act(() => void vi.advanceTimersByTime(100));
    expect(onQueryChange).not.toHaveBeenCalled();
    await user.type(box(), "c");
    act(() => void vi.advanceTimersByTime(50));
    expect(onQueryChange).toHaveBeenCalledExactlyOnceWith("abc");
  });

  it("says in the English placeholder that the data is in Romanian, with an example", () => {
    setup();
    expect(box()).toHaveAttribute("placeholder", expect.stringContaining("Romanian"));
    expect(box()).toHaveAttribute("placeholder", expect.stringContaining("deszăpezire"));
  });

  it("has a Romanian placeholder with the same example", () => {
    const ro = sampleCopy.searchBar("ro");
    setup({ copy: ro });
    expect(screen.getByRole("searchbox", { name: ro.label })).toHaveAttribute("placeholder", expect.stringContaining("deszăpezire"));
  });
});

describe("SearchBar look", () => {
  it("is 56 px tall, with a hint line that describes the field and gives way to the length hint", async () => {
    const { user } = setup();
    expect(screen.getByText(en.hint)).toBeVisible();
    expect(box()).toHaveAccessibleDescription(en.hint);
    expect(box().closest(".MuiOutlinedInput-root")).toHaveStyle({ minHeight: `${size.searchInput}px` });
    await user.type(box(), "a");
    expect(box()).toHaveAccessibleDescription(en.minLengthHint);
    expect(screen.queryByText(en.hint)).toBeNull();
  });
});
