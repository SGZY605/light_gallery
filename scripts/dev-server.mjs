import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

function readEnvValue(name) {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return null;
  }

  const content = readFileSync(envPath, "utf8");
  const line = content
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  if (!line) {
    return null;
  }

  const rawValue = line.slice(name.length + 1).trim();
  const quotedValue = rawValue.match(/^["'](.*)["']$/);

  return quotedValue ? quotedValue[1] : rawValue;
}

const port = process.env.DEV_PORT ?? readEnvValue("DEV_PORT") ?? "3001";
const nextBin = resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "dev", "-p", port], {
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
