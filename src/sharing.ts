import type { EditorState } from "./types";
import { exportCircuitToBase64, importCircuitFromBase64, type SerializedCircuitV2 } from "./persistence";

/**
 * Generate a shareable URL for the current circuit.
 * Format: {origin}{pathname}?c={base64_encoded_circuit}
 */
export function generateShareUrl(state: EditorState): string {
  const base64 = exportCircuitToBase64(state);
  const params = new URLSearchParams({ c: base64 });
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

/**
 * Copy the share URL to the clipboard.
 * Returns true if successful, false if the clipboard API fails or is unavailable.
 */
export async function copyShareUrl(state: EditorState): Promise<boolean> {
  try {
    const url = generateShareUrl(state);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load circuit data from URL query parameter 'c'.
 * Returns deserialized circuit data or null if not found or invalid.
 */
export function loadFromUrl(): SerializedCircuitV2 | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("c");
    if (!encoded) return null;
    return importCircuitFromBase64(encoded);
  } catch {
    return null;
  }
}

/**
 * Show a toast notification message.
 * Appears at the bottom-center of the viewport and auto-dismisses after duration ms.
 */
export function showToast(message: string, duration: number = 3000): void {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation (fade-in via CSS)
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.remove("show");
    // Wait for fade-out animation to complete
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}
