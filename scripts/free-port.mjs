import { execSync } from "node:child_process";

const port = process.argv[2] ?? "5173";

try {
  const out = execSync("netstat -ano", { encoding: "utf8" });
  const pids = new Set(
    out
      .split(/\r?\n/)
      .filter((line) => line.includes("LISTENING") && line.includes(`:${port}`))
      .map((line) => line.trim().split(/\s+/).pop())
      .filter((pid) => pid && /^\d+$/.test(pid)),
  );

  if (pids.size === 0) {
    console.log(`Port ${port} is already free`);
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      console.log(`Freed port ${port} (stopped PID ${pid})`);
    } catch {
      // process may have already exited
    }
  }
} catch {
  console.log(`Port ${port} is already free`);
}
