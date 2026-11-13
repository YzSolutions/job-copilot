import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const release = resolve(root, "release");
const zip = resolve(release, "indigitual-hybrid-job-copilot-0.1.0.zip");

await mkdir(release, { recursive: true });
await rm(zip, { force: true });
execFileSync("powershell.exe", [
  "-NoProfile",
  "-Command",
  `Compress-Archive -Path '${resolve(root, "dist", "*")}' -DestinationPath '${zip}' -Force`
]);

console.log(`Packaged ${zip}`);

