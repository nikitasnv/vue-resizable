import createInjector from "vue-runtime-helpers/dist/inject-style/browser.mjs";

export default (context) =>
  typeof document === "undefined" ? () => {} : createInjector(context);
