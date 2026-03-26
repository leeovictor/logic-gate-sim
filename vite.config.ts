import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/logic-gate-sim/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
