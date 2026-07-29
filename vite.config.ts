import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
// @ts-expect-error This build helper is plain ESM so the app does not need Node typings.
import { seoPages } from "./scripts/seo-pages.mjs";

export default defineConfig({
  base: "./",
  plugins: [
    vue(),
    seoPages({
      siteUrl: "https://miragekant.github.io/did-togashi-post-today/",
    }),
  ],
});
