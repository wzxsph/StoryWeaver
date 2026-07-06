import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error("Usage: node tools/record-revision.mjs <projectRoot> --chapter N --summary TEXT [--status attempted|applied|verified|rolled_back] [--files a,b] [--tasks all|id1,id2] [--risks a,b] [--generated-at ISO]");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 5) usage();

const projectRoot = path.resolve(args[0]);
const options = {
  chapter: null,
  summary: "",
  status: "applied",
  files: [],
  tasks: "all",
  risks: [],
  generatedAt: new Date().toISOString()
};

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];
  if (arg === "--chapter") {
    options.chapter = Number(next);
    i += 1;
  } else if (arg === "--summary") {
    options.summary = next;
    i += 1;
  } else if (arg === "--status") {
    options.status = next;
    i += 1;
  } else if (arg === "--files") {
    options.files = csv(next);
    i += 1;
  } else if (arg === "--tasks") {
    options.tasks = next ?? "all";
    i += 1;
  } else if (arg === "--risks") {
    options.risks = csv(next);
    i += 1;
  } else if (arg === "--generated-at") {
    options.generatedAt = next;
    i += 1;
  } else {
    usage();
  }
}

if (!Number.isInteger(options.chapter) || options.chapter < 1) usage();
if (!options.summary.trim()) usage();
if (!["attempted", "applied", "verified", "rolled_back"].includes(options.status)) usage();

const stateRoot = path.join(projectRoot, "state");
const historyFile = path.join(stateRoot, "chapters", `chapter_${options.chapter}`, "revision_history.json");
const reviewFile = path.join(stateRoot, "chapters", `chapter_${options.chapter}`, "review.json");
const queueFile = path.join(stateRoot, "metadata", "action_queue.json");

function csv(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

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

function nextRevisionId(history) {
  const max = (history.revisions ?? [])
    .map((revision) => Number(String(revision.id ?? "").replace(/^rev_/, "")))
    .filter(Number.isFinite)
    .reduce((a, b) => Math.max(a, b), 0);
  return `rev_${String(max + 1).padStart(3, "0")}`;
}

function tasksFromQueue() {
  if (!exists(queueFile)) return [];
  const queue = readJson(queueFile);
  const wanted = options.tasks === "all" ? null : new Set(csv(options.tasks));
  return (queue.tasks ?? [])
    .filter((task) => task.chapter === options.chapter)
    .filter((task) => task.status === "open")
    .filter((task) => !wanted || wanted.has(task.id));
}

function fixesFromReview() {
  if (!exists(reviewFile)) return [];
  const review = readJson(reviewFile);
  return (review.violations ?? []).map((violation) => ({
    severity: violation.severity ?? "info",
    dimension: violation.dimension ?? "general",
    description: violation.description ?? "",
    suggestion: violation.suggestion ?? ""
  }));
}

function fixFromTask(task) {
  return {
    task_id: task.id,
    severity: task.severity ?? "info",
    dimension: task.dimension ?? "general",
    description: task.description ?? "",
    suggestion: task.suggestion ?? ""
  };
}

const history = exists(historyFile)
  ? readJson(historyFile)
  : {
      chapter: options.chapter,
      generated_at: options.generatedAt,
      schema_version: "2.0",
      revisions: []
    };

if (history.chapter !== options.chapter) {
  throw new Error(`${rel(historyFile)} chapter ${history.chapter} does not match --chapter ${options.chapter}`);
}

const queuedTasks = tasksFromQueue();
const fixes = queuedTasks.length > 0 ? queuedTasks.map(fixFromTask) : fixesFromReview();

history.generated_at = history.generated_at || options.generatedAt;
history.schema_version = history.schema_version || "2.0";
history.revisions = history.revisions ?? [];
history.revisions.push({
  id: nextRevisionId(history),
  timestamp: options.generatedAt,
  status: options.status,
  summary: options.summary.trim(),
  source_review: exists(reviewFile) ? rel(reviewFile) : "",
  files_changed: options.files.length ? options.files : [`chapters/chapter_${options.chapter}.txt`],
  fixes,
  remaining_risks: options.risks,
  requires_verify: options.status !== "verified"
});

writeJson(historyFile, history);
console.log(`Wrote ${rel(historyFile)}`);
