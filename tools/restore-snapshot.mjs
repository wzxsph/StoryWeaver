import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function usage() {
  console.error("Usage: node tools/restore-snapshot.mjs <projectRoot> --snapshot SNAPSHOT_ID [--force] [--skip-validate]");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 3) usage();

const projectRoot = path.resolve(args[0]);
const options = {
  snapshot: "",
  force: false,
  skipValidate: false
};

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];
  if (arg === "--snapshot") {
    options.snapshot = next ?? "";
    i += 1;
  } else if (arg === "--force") {
    options.force = true;
  } else if (arg === "--skip-validate") {
    options.skipValidate = true;
  } else {
    usage();
  }
}

if (!/^snap_[0-9]{8}T[0-9]{9}Z(_[0-9]{3})?$/.test(options.snapshot)) usage();

const snapshotsRoot = path.join(projectRoot, "snapshots");
const snapshotDir = path.join(snapshotsRoot, options.snapshot);
const manifestFile = path.join(snapshotDir, "manifest.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function hashFile(file) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(file);
  hash.update(data);
  return {
    sha256: hash.digest("hex"),
    bytes: data.byteLength
  };
}

function rel(file) {
  return path.relative(projectRoot, file).replaceAll(path.sep, "/");
}

function safeProjectPath(relativePath, label) {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error(`${label} must be a project-relative path: ${relativePath}`);
  }
  const normalized = relativePath.replaceAll("\\", "/");
  if (normalized.split("/").includes("..")) {
    throw new Error(`${label} cannot contain '..': ${relativePath}`);
  }
  if (!normalized.startsWith("state/") && !normalized.startsWith("chapters/") && !normalized.startsWith("snapshots/")) {
    throw new Error(`${label} must stay under state/, chapters/, or snapshots/: ${relativePath}`);
  }
  const resolved = path.resolve(projectRoot, normalized);
  if (!resolved.startsWith(projectRoot + path.sep)) {
    throw new Error(`${label} escapes project root: ${relativePath}`);
  }
  return resolved;
}

function verifyManifest(manifest) {
  if (manifest.snapshot_id !== options.snapshot) {
    throw new Error(`Manifest snapshot_id ${manifest.snapshot_id} does not match --snapshot ${options.snapshot}`);
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error("Snapshot manifest has no files.");
  }
}

function buildRestorePlan(manifest) {
  return manifest.files.map((entry) => {
    if (!entry.source || !entry.snapshot || !entry.sha256) {
      throw new Error("Snapshot manifest contains an incomplete file entry.");
    }
    if (!entry.source.startsWith("state/") && !entry.source.startsWith("chapters/")) {
      throw new Error(`Refusing to restore unsupported source path ${entry.source}`);
    }
    if (!entry.snapshot.startsWith(`snapshots/${options.snapshot}/`)) {
      throw new Error(`Snapshot entry points outside selected snapshot: ${entry.snapshot}`);
    }

    const snapshotPath = safeProjectPath(entry.snapshot, "snapshot");
    const sourcePath = safeProjectPath(entry.source, "source");
    if (!fs.existsSync(snapshotPath)) {
      throw new Error(`Snapshot file is missing: ${entry.snapshot}`);
    }
    const actual = hashFile(snapshotPath);
    if (actual.sha256 !== entry.sha256 || actual.bytes !== entry.bytes) {
      throw new Error(`Snapshot checksum mismatch: ${entry.snapshot}`);
    }

    return {
      sourceRel: entry.source,
      sourcePath,
      snapshotPath
    };
  });
}

function createPreRestoreSnapshot(plan) {
  if (!fs.existsSync(path.join(projectRoot, "state"))) {
    console.log("No current state/ directory found; skipping pre-restore snapshot.");
    return;
  }

  const toolDir = path.dirname(fileURLToPath(import.meta.url));
  const createSnapshotFile = path.join(toolDir, "create-snapshot.mjs");
  const includeChapters = plan.some((entry) => entry.sourceRel.startsWith("chapters/"));
  const snapshotArgs = [
    createSnapshotFile,
    projectRoot,
    "--reason",
    `pre-restore ${options.snapshot}`
  ];
  if (includeChapters) snapshotArgs.push("--include-chapters");

  const result = spawnSync(process.execPath, snapshotArgs, { encoding: "utf8" });
  if (result.status !== 0) {
    if (result.stderr || result.stdout) process.stderr.write(result.stderr || result.stdout);
    throw new Error("Could not create pre-restore snapshot; aborting restore.");
  }
  if (result.stdout) process.stdout.write(result.stdout);
}

function validateRestoredState() {
  const toolDir = path.dirname(fileURLToPath(import.meta.url));
  const validator = path.join(toolDir, "validate-state-schemas.mjs");
  if (!fs.existsSync(validator)) return;
  const result = spawnSync(process.execPath, [validator, projectRoot], { encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error("Restore wrote files, but state schema validation failed.");
  }
}

if (!fs.existsSync(manifestFile)) {
  throw new Error(`Snapshot manifest not found: ${rel(manifestFile)}`);
}

const manifest = readJson(manifestFile);
verifyManifest(manifest);
const plan = buildRestorePlan(manifest);

if (!options.force) {
  console.log(`Restore preview for ${options.snapshot}:`);
  for (const entry of plan) {
    console.log(`  ${entry.sourceRel}`);
  }
  console.log("No files changed. Pass --force to restore these files.");
  process.exit(0);
}

createPreRestoreSnapshot(plan);

for (const entry of plan) {
  fs.mkdirSync(path.dirname(entry.sourcePath), { recursive: true });
  fs.copyFileSync(entry.snapshotPath, entry.sourcePath);
}

if (!options.skipValidate) {
  validateRestoredState();
}

console.log(`Restored ${plan.length} files from ${options.snapshot}`);

