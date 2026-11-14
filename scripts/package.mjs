import { mkdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const release = resolve(root, "release");
const manifest = JSON.parse(await readFile(resolve(root, "dist", "manifest.json"), "utf8"));
const privateJudge = manifest.name.endsWith("(Private Judge)");
if (manifest.name.endsWith("(Debug)")) throw new Error("Local debug builds are not portable. Use npm run build:judge with a registered token.");
const zip = resolve(release, `indigitual-hybrid-job-copilot-0.1.0${privateJudge ? "-private-judge" : ""}.zip`);

await mkdir(release, { recursive: true });
await rm(zip, { force: true });
execFileSync("powershell.exe", [
  "-NoProfile",
  "-Command",
  `Compress-Archive -Path '${resolve(root, "dist", "*")}' -DestinationPath '${zip}' -Force`
]);

console.log(`Packaged ${zip}`);

