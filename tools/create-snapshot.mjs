import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error("Usage: node tools/create-snapshot.mjs <projectRoot> [--reason TEXT] [--generated-at ISO] [--include-chapters] [--list]");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 1) usage();

const projectRoot = path.resolve(args[0]);
const options = {
  reason: "manual snapshot",
  generatedAt: new Date().toISOString(),
  includeChapters: false,
  list: false
};

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];
  if (arg === "--reason") {
    options.reason = next ?? "";
    i += 1;
  } else if (arg === "--generated-at") {
    options.generatedAt = next;
    i += 1;
  } else if (arg === "--include-chapters") {
    options.includeChapters = true;
  } else if (arg === "--list") {
    options.list = true;
  } else {
    usage();
  }
}

const snapshotsRoot = path.join(projectRoot, "snapshots");

function normalizeIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --generated-at value: ${value}`);
  }
  return date.toISOString();
}

function snapshotIdFromIso(iso) {
  return `snap_${iso.replace(/[-:]/g, "").replace(".", "")}`;
}

function rel(file) {
  return path.relative(projectRoot, file).replaceAll(path.sep, "/");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
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

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function allocateSnapshotDir(baseId) {
  for (let index = 0; index < 1000; index += 1) {
    const id = index === 0 ? baseId : `${baseId}_${String(index).padStart(3, "0")}`;
    const dir = path.join(snapshotsRoot, id);
    if (!fs.existsSync(dir)) return { id, dir };
  }
  throw new Error(`Could not allocate a snapshot id for ${baseId}`);
}

function listSnapshots() {
  if (!fs.existsSync(snapshotsRoot)) {
    console.log("No StoryWeaver snapshots found.");
    return;
  }

  const manifests = fs.readdirSync(snapshotsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(snapshotsRoot, entry.name, "manifest.json"))
    .filter((file) => fs.existsSync(file))
    .map((file) => readJson(file))
    .sort((a, b) => String(b.generated_at).localeCompare(String(a.generated_at)));

  if (manifests.length === 0) {
    console.log("No StoryWeaver snapshots found.");
    return;
  }

  for (const manifest of manifests) {
    const count = manifest.counts?.files ?? 0;
    const bytes = manifest.counts?.bytes ?? 0;
    console.log(`${manifest.snapshot_id}\t${manifest.generated_at}\t${count} files\t${bytes} bytes\t${manifest.reason ?? ""}`);
  }
}

function createSnapshot() {
  const stateRoot = path.join(projectRoot, "state");
  if (!fs.existsSync(stateRoot)) {
    throw new Error(`Cannot snapshot ${projectRoot}: missing state/ directory.`);
  }

  const generatedAt = normalizeIso(options.generatedAt);
  const baseId = snapshotIdFromIso(generatedAt);
  const { id: snapshotId, dir: snapshotDir } = allocateSnapshotDir(baseId);
  const sourceRoots = [stateRoot];
  const chaptersRoot = path.join(projectRoot, "chapters");
  if (options.includeChapters && fs.existsSync(chaptersRoot)) {
    sourceRoots.push(chaptersRoot);
  }

  const copiedFiles = [];
  let totalBytes = 0;

  for (const sourceRoot of sourceRoots) {
    for (const sourceFile of walkFiles(sourceRoot)) {
      const sourceRel = rel(sourceFile);
      const snapshotFile = path.join(snapshotDir, sourceRel);
      const before = hashFile(sourceFile);
      fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
      fs.copyFileSync(sourceFile, snapshotFile);
      const after = hashFile(snapshotFile);
      if (after.sha256 !== before.sha256 || after.bytes !== before.bytes) {
        throw new Error(`Snapshot copy verification failed for ${sourceRel}`);
      }
      totalBytes += before.bytes;
      copiedFiles.push({
        source: sourceRel,
        snapshot: rel(snapshotFile),
        sha256: before.sha256,
        bytes: before.bytes
      });
    }
  }

  if (copiedFiles.length === 0) {
    throw new Error("No files found to snapshot.");
  }

  const manifest = {
    snapshot_id: snapshotId,
    generated_at: generatedAt,
    schema_version: "2.0",
    project_root: projectRoot,
    reason: options.reason || "manual snapshot",
    scope: {
      state: true,
      chapters: options.includeChapters
    },
    files: copiedFiles,
    counts: {
      files: copiedFiles.length,
      bytes: totalBytes
    }
  };

  writeJson(path.join(snapshotDir, "manifest.json"), manifest);
  console.log(`Created snapshot ${snapshotId}`);
  console.log(`Wrote ${rel(path.join(snapshotDir, "manifest.json"))}`);
}

if (options.list) {
  listSnapshots();
} else {
  createSnapshot();
}
