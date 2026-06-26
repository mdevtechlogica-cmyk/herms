import { execSync } from "node:child_process";
import { ensureProjectRoot } from "./project-root.mjs";

ensureProjectRoot();
console.log("Building HERMS for mobile preview…");
execSync("node scripts/clean-dist.mjs", { stdio: "inherit" });
execSync("npm run build", { stdio: "inherit" });
console.log("Starting preview server on all interfaces (port 5173)…");
execSync("node scripts/preview-mobile.mjs", { stdio: "inherit" });
