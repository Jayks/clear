/**
 * Kills whatever process is holding port 3000, then exits.
 * Used by `pnpm dev:kill` and `pnpm dev:restart`.
 */
import { execSync } from "child_process";

const PORT = 3000;

function findPid() {
  try {
    const out = execSync(`netstat -ano`, { encoding: "utf8" });
    for (const line of out.split("\n")) {
      if (line.includes(`:${PORT}`) && line.includes("LISTENING")) {
        const pid = line.trim().split(/\s+/).at(-1);
        if (pid && pid !== "0") return pid;
      }
    }
  } catch {}
  return null;
}

function portFree(retries = 20, delayMs = 250) {
  return new Promise((resolve) => {
    const check = (n) => {
      const pid = findPid();
      if (!pid) return resolve(true);
      if (n <= 0) return resolve(false);
      setTimeout(() => check(n - 1), delayMs);
    };
    check(retries);
  });
}

const pid = findPid();
if (!pid) {
  console.log(`Nothing listening on port ${PORT}.`);
} else {
  console.log(`Killing PID ${pid} (port ${PORT})…`);
  try {
    execSync(`powershell -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`, { stdio: "inherit" });
  } catch {}
  const freed = await portFree();
  if (freed) {
    console.log(`Port ${PORT} is now free.`);
  } else {
    console.warn(`Port ${PORT} still occupied after timeout.`);
    process.exit(1);
  }
}
