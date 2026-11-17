import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import cssInjectedByJs from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [vue(), cssInjectedByJs()],
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
