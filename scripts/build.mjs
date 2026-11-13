import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const debug = process.argv.includes("--debug");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  entryPoints: [resolve(root, "src/panel.ts"), resolve(root, "src/background.ts")],
  bundle: true,
  format: "esm",
  outdir: dist,
  target: "chrome139",
  minify: false,
  sourcemap: false,
  define: { __APP_CHECK_DEBUG__: JSON.stringify(debug) }
});

await Promise.all([
  cp(resolve(root, "src/panel.html"), resolve(dist, "panel.html")),
  cp(resolve(root, "src/panel.css"), resolve(dist, "panel.css"))
]);

const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
manifest.name += debug ? " (Debug)" : "";
await writeFile(resolve(dist, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`Built ${debug ? "debug" : "production"} extension in dist/`);

