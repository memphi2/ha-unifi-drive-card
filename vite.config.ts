import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    sourcemap: true,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "ha-unifi-drive-card.js",
    },
    rollupOptions: {
      output: {
        entryFileNames: "ha-unifi-drive-card.js",
      },
    },
  },
});
