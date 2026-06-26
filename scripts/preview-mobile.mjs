import { execSync } from "node:child_process";
import { ensureProjectRoot } from "./project-root.mjs";
import { distLooksValid } from "./dist-integrity.mjs";

const PORT = process.env.CAPACITOR_DEV_PORT ?? "5173";
const skipBuild = process.env.PREVIEW_SKIP_BUILD === "1";

ensureProjectRoot();

function rebuild() {
  console.log("Building fresh production bundle for preview…");
  execSync("node scripts/clean-dist.mjs", { stdio: "inherit" });
  execSync("npm run build", { stdio: "inherit" });
}

if (!skipBuild) {
  rebuild();
} else if (!distLooksValid()) {
  console.log("dist/ is missing or inconsistent — rebuilding…");
  rebuild();
}

execSync(`node scripts/free-port.mjs ${PORT}`, { stdio: "inherit" });
execSync(`npx vite preview --host 0.0.0.0 --port ${PORT} --strictPort`, { stdio: "inherit" });
