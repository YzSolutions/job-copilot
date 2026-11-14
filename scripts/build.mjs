import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const judge = process.argv.includes("--judge");
const debug = judge || process.argv.includes("--debug");
const judgeToken = process.env.JOB_COPILOT_APP_CHECK_DEBUG_TOKEN;
if (judge && !judgeToken) throw new Error("JOB_COPILOT_APP_CHECK_DEBUG_TOKEN is required for a portable private judge build.");
const appCheckDebug = judge ? judgeToken : debug ? judgeToken || true : false;

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
  define: { __APP_CHECK_DEBUG__: JSON.stringify(appCheckDebug) }
});

const panelBundle = await readFile(resolve(dist, "panel.js"), "utf8");
if (panelBundle.includes("recaptcha/enterprise.js")) throw new Error("The extension bundle must not load remote reCAPTCHA scripts.");
if (!debug && !panelBundle.includes("Cloud tailoring is disabled in this public build")) throw new Error("The public build must fail closed for cloud AI.");

await Promise.all([
  cp(resolve(root, "src/panel.html"), resolve(dist, "panel.html")),
  cp(resolve(root, "src/panel.css"), resolve(dist, "panel.css"))
]);

const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
manifest.name += judge ? " (Private Judge)" : debug ? " (Debug)" : "";
await writeFile(resolve(dist, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`Built ${judge ? "private judge" : debug ? "debug" : "production"} extension in dist/`);

