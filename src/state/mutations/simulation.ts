import type { EditorState } from "@/core/types";
import { setCurrentTheme } from "@/core/theme";

export function setTheme(state: EditorState, theme: "light" | "dark"): void {
  state.theme = theme;
  setCurrentTheme(theme);
  document.documentElement.dataset.theme = theme;
}
