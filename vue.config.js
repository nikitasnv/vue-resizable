const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,
  css: {
    extract: false,
  },
  publicPath: process.env.NODE_ENV === "production" ? "/vue-resizable/" : "/",
});
