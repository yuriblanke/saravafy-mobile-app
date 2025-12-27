import { spawnSync } from "node:child_process";

const runLint = process.env.EAS_RUN_LINT === "1";

if (!runLint) {
  console.log("[eas] SKIP lint (set EAS_RUN_LINT=1 to enable)");
  process.exit(0);
}

console.log("[eas] Running lint...");

const res = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "-s", "lint"],
  {
    stdio: "inherit",
    env: process.env,
  }
);

process.exit(res.status ?? 1);
