import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const outdir = resolve(root, "dist-test");
await rm(outdir, { recursive: true, force: true });
await build({
  entryPoints: [resolve(root, "src/prompts.ts"), resolve(root, "src/docx.ts"), resolve(root, "src/vault.ts")],
  outdir,
  format: "esm",
  platform: "node"
});

