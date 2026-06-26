import { chdir } from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** npm scripts inherit the shell cwd — always jump to the repo root first. */
export function ensureProjectRoot() {
  chdir(ROOT);
  return ROOT;
}
