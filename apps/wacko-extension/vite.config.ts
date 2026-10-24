import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";
import tailwindcss from "@tailwindcss/vite";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    name: "Wacko — BitSocial Stranger Dating",
    description: "Decentralized Dating for Strangers powered by the BitSocial Protocol. Zero central servers, pure client-side cryptography.",
    version: pkg.version,
    ...manifest,
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    conditions: ['browser', 'svelte'],
    mainFields: ['browser', 'module', 'main'],
  },
  plugins: [
    tailwindcss(),
    svelte(),
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ["package.json", "manifest.json"],
    }),
  ],
});
