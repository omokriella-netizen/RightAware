import fs from "node:fs";
import path from "node:path";

const targetRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("src");
const STATE_OWNER = path.join(targetRoot, "conversation-state", "state-store.js");
const errors = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) return [];
      return walk(fullPath);
    }
    return /\.(?:js|mjs|cjs|ts)$/.test(entry.name) ? [fullPath] : [];
  });
}

for (const file of walk(targetRoot)) {
  const source = fs.readFileSync(file, "utf8");
  const importsClient = /(?:from\s*|import\s*\(|require\s*\()\s*["'][^"']*infra\/authoritative-state-client/.test(source);

  if (importsClient && path.resolve(file) !== path.resolve(STATE_OWNER)) {
    errors.push(`${path.relative(targetRoot, file)}: unauthorized state client import`);
  }
}

if (!fs.existsSync(STATE_OWNER)) {
  errors.push(`Missing designated state owner at ${STATE_OWNER}`);
}

if (errors.length > 0) {
  console.error("STATE BOUNDARY VIOLATION\n" + errors.map(e => `- ${e}`).join("\n"));
  process.exit(1);
}
console.log("State boundary check passed.");
