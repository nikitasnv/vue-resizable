import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "rollup-plugin-vue";

export default defineConfig({
  plugins: [
    vue({
      needMap: false,
      template: { isProduction: true },
      style: { postcssCleanOptions: { disabled: true } },
      styleInjector:
        "~" +
        fileURLToPath(new URL("./scripts/style-injector.mjs", import.meta.url)),
    }),
  ],
  build: {
    // The Vue CLI build produces the existing CommonJS and UMD files first.
    emptyOutDir: false,
    target: "es2018",
    lib: {
      entry: fileURLToPath(new URL("./src/main.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "vue-resizable.esm.mjs",
    },
    rolldownOptions: {
      external: ["vue"],
    },
  },
});
