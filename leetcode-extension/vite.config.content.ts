import { defineConfig } from "vite";
import { resolve } from "path";

// Separate build config for content.ts.
// Content scripts run as CLASSIC scripts (no ES module support),
// so they must be built as a self-contained IIFE with NO import statements.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false, // Don't wipe the main build output
    lib: {
      entry: resolve(__dirname, "src/content/content.ts"),
      name: "LeetSyncContent",
      fileName: () => "content.js",
      formats: ["iife"], // Self-contained, no imports
    },
    rollupOptions: {
      output: {
        // Inline all dynamic imports — no chunks allowed in content scripts
        inlineDynamicImports: true,
      },
    },
  },
});
