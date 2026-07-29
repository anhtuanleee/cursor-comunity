import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import postgres from "postgres";

const root = resolve(import.meta.dirname, "..");
const inheritedEnvironment = new Set(Object.keys(process.env));
process.env.WRANGLER_LOG_PATH ||= join(tmpdir(), "cursor-community-wrangler.log");

function parseEnvFile(path) {
  if (!existsSync(path)) return {};

  const values = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function loadLocalEnvironment() {
  const localValues = {
    ...parseEnvFile(join(root, ".env")),
    ...parseEnvFile(join(root, ".env.local")),
  };

  for (const [key, value] of Object.entries(localValues)) {
    if (!inheritedEnvironment.has(key)) process.env[key] = value;
  }
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}`);
  }
}

function succeeds(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "ignore",
  });
  return result.status === 0;
}

function runCaptured(command, args) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    let output = "";

    child.stdout.on("data", chunk => {
      output += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr.on("data", chunk => {
      output += chunk.toString();
      process.stderr.write(chunk);
    });
    child.on("error", rejectPromise);
    child.on("close", code => {
      if (code === 0) resolvePromise(output);
      else rejectPromise(new Error(`${command} exited with status ${code ?? "unknown"}`));
    });
  });
}

function ensureAuthentication() {
  if (!succeeds("vercel", ["whoami"])) {
    console.log("\nVercel is not authenticated. Opening the login flow...");
    run("vercel", ["login"]);
  }

  if (!succeeds("npx", ["wrangler", "whoami"])) {
    console.log("\nCloudflare is not authenticated. Opening the login flow...");
    run("npx", ["wrangler", "login"]);
  }
}

function ensureVercelLink() {
  const linked =
    existsSync(join(root, ".vercel", "project.json")) ||
    existsSync(join(root, ".vercel", "repo.json"));
  if (linked) return;

  console.log("\nLinking this repository to Vercel...");
  if (!succeeds("vercel", ["link", "--repo", "--yes"])) {
    run("vercel", ["link"]);
  }
}

async function migrateDatabase(databaseUrl) {
  console.log("\n> applying PostgreSQL schema and migrations");
  const sql = postgres(databaseUrl, {
    ssl: "require",
    max: 1,
    prepare: false,
  });

  const sqlFiles = [
    join(root, "partykit", "schema.sql"),
    join(root, "partykit", "migrations", "001_hardening.sql"),
    join(root, "partykit", "migrations", "002_isolate_gallery_categories.sql"),
    join(root, "partykit", "migrations", "003_realtime_collaboration.sql"),
    join(root, "partykit", "migrations", "004_content_ingestion_foundation.sql"),
  ];

  try {
    for (const path of sqlFiles) {
      await sql.unsafe(readFileSync(path, "utf8"));
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function setVercelEnvironment(name, value, { sensitive = false } = {}) {
  const args = [
    "env",
    "add",
    name,
    "production",
    "--force",
    "--yes",
    sensitive ? "--sensitive" : "--no-sensitive",
  ];
  run("vercel", args, {
    stdio: ["pipe", "inherit", "inherit"],
    input: `${value}\n`,
  });
}

function findDeploymentUrl(output, domainPattern) {
  const plainOutput = output.replace(/\u001b\[[0-9;]*m/g, "");
  const urls = plainOutput.match(/https:\/\/[^\s]+/g) || [];
  return urls
    .map(value => value.replace(/[),.;]+$/, ""))
    .reverse()
    .find(value => domainPattern.test(value));
}

async function main() {
  loadLocalEnvironment();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is missing. Copy .env.example to .env and add your PostgreSQL connection string.",
    );
  }

  run("npm", ["run", "worker:types"]);
  run("npm", ["run", "lint"]);
  await migrateDatabase(databaseUrl);
  run("npm", ["run", "content:normalize-slugs"]);
  run("npm", ["run", "build"]);

  ensureAuthentication();
  ensureVercelLink();

  const temporaryDirectory = mkdtempSync(join(tmpdir(), "cursor-community-deploy-"));
  const workerSecretsFile = join(temporaryDirectory, "worker-secrets.json");
  const workerSecrets = { DATABASE_URL: databaseUrl };
  if (process.env.CREATIVE_FEEDS) {
    workerSecrets.CREATIVE_FEEDS = process.env.CREATIVE_FEEDS;
  }
  writeFileSync(
    workerSecretsFile,
    JSON.stringify(workerSecrets),
    { mode: 0o600 },
  );

  let workerOutput;
  try {
    workerOutput = await runCaptured("npx", [
      "wrangler",
      "deploy",
      "--config",
      "wrangler.jsonc",
      "--secrets-file",
      workerSecretsFile,
    ]);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }

  const configuredWorkerHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST;
  const productionWorkerHost =
    configuredWorkerHost && !/(?:^|\/\/)localhost(?::|\/|$)/i.test(configuredWorkerHost)
      ? configuredWorkerHost
      : undefined;
  const workerUrl =
    productionWorkerHost ||
    findDeploymentUrl(workerOutput, /workers\.dev(?:\/|$)/i);
  if (!workerUrl) {
    throw new Error(
      "Could not detect the Worker URL. Set NEXT_PUBLIC_PARTYKIT_HOST in .env and run again.",
    );
  }

  setVercelEnvironment("DATABASE_URL", databaseUrl, { sensitive: true });
  setVercelEnvironment("NEXT_PUBLIC_PARTYKIT_HOST", workerUrl);

  const vercelOutput = await runCaptured("vercel", [
    "deploy",
    "--prod",
    "--yes",
  ]);
  const frontendUrl = findDeploymentUrl(vercelOutput, /vercel\.app(?:\/|$)/i);

  console.log("\nDeployment complete.");
  console.log(`Realtime: ${workerUrl}`);
  if (frontendUrl) console.log(`Frontend: ${frontendUrl}`);
}

main().catch(error => {
  console.error(`\nDeployment failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
