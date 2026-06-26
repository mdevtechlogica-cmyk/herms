import fs from "node:fs";
import path from "node:path";

const RELATIVE_IMPORT_RE =
  /(?:import\s*(?:\([^)]*\)|\{[^}]*\}|[\w$*{},\s]+)\s*from\s*)?["']\.\/([^"']+)["']/g;

export function distLooksValid(cwd = process.cwd()) {
  const serverEntry = path.join(cwd, "dist/server/server.js");
  const assetsDir = path.join(cwd, "dist/server/assets");
  if (!fs.existsSync(serverEntry) || !fs.existsSync(assetsDir)) return false;

  const assetFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".js"));

  for (const file of assetFiles) {
    const content = fs.readFileSync(path.join(assetsDir, file), "utf8");
    for (const match of content.matchAll(RELATIVE_IMPORT_RE)) {
      const rel = match[1];
      if (!rel.endsWith(".js")) continue;
      if (!fs.existsSync(path.join(assetsDir, rel))) return false;
    }
  }

  return assetFiles.length > 0;
}
