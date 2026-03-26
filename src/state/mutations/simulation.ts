import { setCurrentTheme } from "@/core/theme";
import type { EditorState } from "@/core/types";

export function setTheme(state: EditorState, theme: "light" | "dark"): void {
  state.theme = theme;
  setCurrentTheme(theme);
  document.documentElement.dataset.theme = theme;
}
