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
