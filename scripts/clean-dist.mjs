import fs from "node:fs";
import path from "node:path";
import { ensureProjectRoot } from "./project-root.mjs";

ensureProjectRoot();

const dist = path.join(process.cwd(), "dist");
if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
  console.log("Removed stale dist/");
}
