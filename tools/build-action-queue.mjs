import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error("Usage: node tools/build-action-queue.mjs <projectRoot> [--generated-at ISO]");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 1) usage();

const projectRoot = path.resolve(args[0]);
const options = {
  generatedAt: new Date().toISOString()
};

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];
  if (arg === "--generated-at") {
    options.generatedAt = next;
    i += 1;
  } else {
    usage();
  }
}

const stateRoot = path.join(projectRoot, "state");

function exists(file) {
  return fs.existsSync(file);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function rel(file) {
  return path.relative(projectRoot, file).replaceAll(path.sep, "/");
}

function walk(dir) {
  if (!exists(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function slug(value) {
  return String(value ?? "general")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "general";
}

function padChapter(chapter) {
  return String(chapter ?? 0).padStart(3, "0");
}

function reviewFiles() {
  return walk(path.join(stateRoot, "chapters"))
    .filter((file) => /[/\\]chapter_[0-9]+[/\\]review\.json$/.test(file))
    .sort();
}

function taskFromViolation(review, file, violation, index) {
  const chapter = review.chapter ?? null;
  const dimension = violation.dimension ?? "general";
  return {
    id: `act_review_chapter_${padChapter(chapter)}_${String(index + 1).padStart(3, "0")}_${slug(dimension)}`,
    status: "open",
    severity: violation.severity ?? "info",
    chapter,
    dimension,
    description: violation.description ?? "",
    location: violation.location ?? "",
    suggestion: violation.suggestion ?? "",
    source: rel(file),
    created_from: "review"
  };
}

function taskFromIndexWarning(warning, index) {
  return {
    id: `act_index_${String(index + 1).padStart(3, "0")}`,
    status: "open",
    severity: warning.level ?? "info",
    chapter: null,
    dimension: "state_health",
    description: warning.message ?? "",
    location: warning.source ?? "",
    suggestion: "修复状态文件后重新运行 /storyweaver:index 和 /storyweaver:queue。",
    source: "state/metadata/index.json",
    created_from: "index"
  };
}

if (!exists(stateRoot)) {
  throw new Error(`Missing state directory: ${stateRoot}`);
}

const tasks = [];

for (const file of reviewFiles()) {
  const review = readJson(file);
  for (const [index, violation] of (review.violations ?? []).entries()) {
    if (!["critical", "warning", "info"].includes(violation.severity)) continue;
    tasks.push(taskFromViolation(review, file, violation, index));
  }
}

const indexFile = path.join(stateRoot, "metadata", "index.json");
if (exists(indexFile)) {
  const index = readJson(indexFile);
  for (const [warningIndex, warning] of (index.warnings ?? []).entries()) {
    tasks.push(taskFromIndexWarning(warning, warningIndex));
  }
}

const severityRank = { critical: 0, warning: 1, info: 2 };
tasks.sort((a, b) => {
  const severityDiff = severityRank[a.severity] - severityRank[b.severity];
  if (severityDiff) return severityDiff;
  const chapterDiff = (a.chapter ?? Number.MAX_SAFE_INTEGER) - (b.chapter ?? Number.MAX_SAFE_INTEGER);
  if (chapterDiff) return chapterDiff;
  return a.id.localeCompare(b.id);
});

const byChapter = new Map();
for (const task of tasks) {
  if (!Number.isFinite(task.chapter)) continue;
  byChapter.set(task.chapter, (byChapter.get(task.chapter) ?? 0) + 1);
}

const summary = {
  open: tasks.length,
  critical: tasks.filter((task) => task.severity === "critical").length,
  warning: tasks.filter((task) => task.severity === "warning").length,
  info: tasks.filter((task) => task.severity === "info").length,
  by_chapter: Array.from(byChapter.entries())
    .sort(([a], [b]) => a - b)
    .map(([chapter, open]) => ({ chapter, open }))
};

const queue = {
  generated_at: options.generatedAt,
  schema_version: "2.0",
  summary,
  tasks
};

const outputFile = path.join(stateRoot, "metadata", "action_queue.json");
writeJson(outputFile, queue);
console.log(`Wrote ${rel(outputFile)}`);
