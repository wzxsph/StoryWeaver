import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error("Usage: node tools/build-index.mjs <projectRoot> [--generated-at ISO]");
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
const stateDeltaKeys = [
  "characters",
  "items",
  "scenes",
  "organizations",
  "concepts",
  "timeline_events",
  "plot_threads",
  "relationships"
];

const entityConfigs = [
  { kind: "character", dir: "characters", summaryKey: "characters" },
  { kind: "item", dir: "items", summaryKey: "items" },
  { kind: "scene", dir: "scenes", summaryKey: "scenes" },
  { kind: "organization", dir: "organizations", summaryKey: "organizations" },
  { kind: "concept", dir: "concepts", summaryKey: "concepts" },
  { kind: "timeline_event", dir: "timeline", summaryKey: "timeline_events" },
  { kind: "plot_thread", dir: "plot_threads", summaryKey: "plot_threads" },
  { kind: "relationship", dir: "relationships", summaryKey: "relationships" }
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function exists(file) {
  return fs.existsSync(file);
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

function jsonFiles(dir) {
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function countWordsFromManuscript(file) {
  if (!exists(file)) return 0;
  return fs.readFileSync(file, "utf8").replace(/\s+/g, "").length;
}

function displayName(kind, data) {
  if (data.name) return data.name;
  if (data.title) return data.title;
  if (kind === "relationship" && data.source_id && data.target_id) {
    return `${data.source_id} -> ${data.target_id}`;
  }
  return data.id ?? "";
}

function lastUpdatedChapter(data) {
  const candidates = [
    data.last_updated_chapter,
    data.current_state?.last_updated_chapter,
    data.chapter,
    data.started_chapter
  ];
  for (const value of candidates) {
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function warning(level, message, source = "") {
  const item = { level, message };
  if (source) item.source = source;
  return item;
}

if (!exists(stateRoot)) {
  throw new Error(`Missing state directory: ${stateRoot}`);
}

const warnings = [];
const entities = [];
const entityById = new Map();

for (const config of entityConfigs) {
  const dir = path.join(stateRoot, config.dir);
  for (const file of jsonFiles(dir)) {
    const data = readJson(file);
    if (!data.id) {
      warnings.push(warning("warning", `Entity file has no id: ${rel(file)}`, rel(file)));
      continue;
    }

    const entity = {
      id: data.id,
      kind: config.kind,
      name: displayName(config.kind, data),
      source: rel(file),
      last_updated_chapter: lastUpdatedChapter(data),
      refs_in: []
    };
    entities.push(entity);
    entityById.set(entity.id, entity);
  }
}

const idPattern = /\b(char|item|scene|org|concept|event|plot|rel)_[0-9]{3,}\b/g;
const allStateJsonFiles = walk(stateRoot)
  .filter((file) => file.endsWith(".json"))
  .sort();

for (const file of allStateJsonFiles) {
  const relative = rel(file);
  const text = fs.readFileSync(file, "utf8");
  const seenInFile = new Set(text.match(idPattern) ?? []);
  for (const id of seenInFile) {
    const entity = entityById.get(id);
    if (!entity || entity.source === relative) continue;
    entity.refs_in.push(relative);
  }
}

for (const entity of entities) {
  entity.refs_in = Array.from(new Set(entity.refs_in)).sort();
  if (entity.refs_in.length === 0) {
    warnings.push(warning("info", `Entity is not referenced by any other state file: ${entity.id}`, entity.source));
  }
}

const chapterDir = path.join(stateRoot, "chapters");
const chapterFiles = jsonFiles(chapterDir)
  .filter((file) => /^chapter_[0-9]+\.json$/.test(path.basename(file)));

const chapters = [];
const openLoops = [];

for (const file of chapterFiles) {
  const data = readJson(file);
  const chapter = Number(path.basename(file, ".json").replace("chapter_", ""));
  const manuscript = path.join(projectRoot, "chapters", `chapter_${chapter}.txt`);
  const brief = path.join(stateRoot, "chapters", `chapter_${chapter}`, "brief.json");
  const extraction = path.join(stateRoot, "chapters", `chapter_${chapter}`, "extraction.json");
  const review = path.join(stateRoot, "chapters", `chapter_${chapter}`, "review.json");
  const gate = path.join(stateRoot, "chapters", `chapter_${chapter}`, "gate.json");
  const delta = data.state_delta ?? {};
  const stateDeltaCounts = Object.fromEntries(
    stateDeltaKeys.map((key) => [key, asArray(delta[key]).length])
  );

  const chapterIndex = {
    chapter,
    title: data.title ?? "",
    status: data.status ?? "unknown",
    source: rel(file),
    has_manuscript: exists(manuscript),
    has_brief: exists(brief),
    has_extraction: exists(extraction),
    has_review: exists(review),
    has_gate: exists(gate),
    word_count: Number.isFinite(data.word_count) ? data.word_count : countWordsFromManuscript(manuscript),
    state_delta_counts: stateDeltaCounts
  };

  if (chapterIndex.has_gate) {
    const gateData = readJson(gate);
    chapterIndex.gate_status = gateData.result?.status ?? "unknown";
    chapterIndex.gate_score = gateData.result?.score ?? null;
  }
  chapters.push(chapterIndex);

  for (const text of asArray(data.open_loops_introduced)) {
    openLoops.push({ chapter, status: "introduced", text, source: rel(file) });
  }
  for (const text of asArray(data.open_loops_advanced)) {
    openLoops.push({ chapter, status: "advanced", text, source: rel(file) });
  }
  for (const text of asArray(data.open_loops_resolved)) {
    openLoops.push({ chapter, status: "resolved", text, source: rel(file) });
  }

  if (chapterIndex.status !== "planned" && !chapterIndex.has_manuscript) {
    warnings.push(warning("critical", `Chapter ${chapter} is ${chapterIndex.status} but has no manuscript.`, rel(file)));
  }
  if (chapterIndex.status !== "planned" && !chapterIndex.has_brief) {
    warnings.push(warning("warning", `Chapter ${chapter} is ${chapterIndex.status} but has no brief.`, rel(file)));
  }
  if (chapterIndex.status !== "planned" && !chapterIndex.has_extraction) {
    warnings.push(warning("warning", `Chapter ${chapter} is ${chapterIndex.status} but has no extraction report.`, rel(file)));
  }
  if (["verified", "revised", "locked"].includes(chapterIndex.status) && !chapterIndex.has_review) {
    warnings.push(warning("critical", `Chapter ${chapter} is ${chapterIndex.status} but has no review report.`, rel(file)));
  }
  if (["verified", "revised", "locked"].includes(chapterIndex.status) && !chapterIndex.has_gate) {
    warnings.push(warning("warning", `Chapter ${chapter} is ${chapterIndex.status} but has no chapter gate report.`, rel(file)));
  }
  if (chapterIndex.has_gate && chapterIndex.gate_status === "blocked") {
    warnings.push(warning("critical", `Chapter ${chapter} gate is blocked.`, rel(gate)));
  }
}

chapters.sort((a, b) => a.chapter - b.chapter);
openLoops.sort((a, b) => a.chapter - b.chapter || a.text.localeCompare(b.text, "zh-Hans-CN"));

const projectFile = path.join(stateRoot, "metadata", "project.json");
if (!exists(projectFile)) {
  warnings.push(warning("warning", "Missing project metadata.", "state/metadata/project.json"));
} else {
  const project = readJson(projectFile);
  const latestChapter = chapters.at(-1)?.chapter ?? 0;
  if (project.last_updated_chapter > latestChapter) {
    warnings.push(warning("warning", `Project last_updated_chapter ${project.last_updated_chapter} is ahead of indexed chapters.`, rel(projectFile)));
  }
}

if (chapters.length === 0) {
  warnings.push(warning("info", "No chapter contracts found.", "state/chapters/"));
}

for (const file of jsonFiles(path.join(stateRoot, "plot_threads"))) {
  const data = readJson(file);
  if (data.status === "active" && asArray(data.related_events).length === 0) {
    warnings.push(warning("warning", `Active plot thread has no related events: ${data.id}`, rel(file)));
  }
}

const summary = Object.fromEntries(entityConfigs.map((config) => [config.summaryKey, 0]));
for (const config of entityConfigs) {
  summary[config.summaryKey] = entities.filter((entity) => entity.kind === config.kind).length;
}
summary.chapters = chapters.length;
summary.briefs = allStateJsonFiles.filter((file) => /[/\\]state[/\\]chapters[/\\]chapter_[0-9]+[/\\]brief\.json$/.test(file)).length;
summary.extractions = allStateJsonFiles.filter((file) => /[/\\]state[/\\]chapters[/\\]chapter_[0-9]+[/\\]extraction\.json$/.test(file)).length;
summary.reviews = allStateJsonFiles.filter((file) => /[/\\]state[/\\]chapters[/\\]chapter_[0-9]+[/\\]review\.json$/.test(file)).length;
summary.gates = allStateJsonFiles.filter((file) => /[/\\]state[/\\]chapters[/\\]chapter_[0-9]+[/\\]gate\.json$/.test(file)).length;

const index = {
  generated_at: options.generatedAt,
  schema_version: "2.0",
  summary,
  latest_chapter: chapters.at(-1)?.chapter ?? 0,
  entities: entities.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id)),
  chapters,
  open_loops: openLoops,
  warnings
};

const outputFile = path.join(stateRoot, "metadata", "index.json");
writeJson(outputFile, index);
console.log(`Wrote ${rel(outputFile)}`);
