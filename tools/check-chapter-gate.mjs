import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function usage() {
  console.error("Usage: node tools/check-chapter-gate.mjs <projectRoot> --chapter N [--min-words N] [--promote verified|revised|locked] [--generated-at ISO]");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 3) usage();

const projectRoot = path.resolve(args[0]);
const options = {
  chapter: null,
  minWords: 1,
  promote: "",
  generatedAt: new Date().toISOString()
};

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];
  if (arg === "--chapter") {
    options.chapter = Number(next);
    i += 1;
  } else if (arg === "--min-words") {
    options.minWords = Number(next);
    i += 1;
  } else if (arg === "--promote") {
    options.promote = next ?? "";
    i += 1;
  } else if (arg === "--generated-at") {
    options.generatedAt = next;
    i += 1;
  } else {
    usage();
  }
}

if (!Number.isInteger(options.chapter) || options.chapter < 1) usage();
if (!Number.isFinite(options.minWords) || options.minWords < 0) usage();
if (options.promote && !["verified", "revised", "locked"].includes(options.promote)) usage();

const stateRoot = path.join(projectRoot, "state");
const chapterRecordFile = path.join(stateRoot, "chapters", `chapter_${options.chapter}.json`);
const chapterDir = path.join(stateRoot, "chapters", `chapter_${options.chapter}`);
const manuscriptFile = path.join(projectRoot, "chapters", `chapter_${options.chapter}.txt`);
const briefFile = path.join(chapterDir, "brief.json");
const extractionFile = path.join(chapterDir, "extraction.json");
const reviewFile = path.join(chapterDir, "review.json");
const gateFile = path.join(chapterDir, "gate.json");
const queueFile = path.join(stateRoot, "metadata", "action_queue.json");
const indexFile = path.join(stateRoot, "metadata", "index.json");
const projectFile = path.join(stateRoot, "metadata", "project.json");

function exists(file) {
  return fs.existsSync(file);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function rel(file) {
  return path.relative(projectRoot, file).replaceAll(path.sep, "/");
}

function issue(code, message, source) {
  return { code, message, source };
}

function countWords(text) {
  return text.replace(/\s+/g, "").length;
}

function countParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .length;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function openTasksForChapter(queue) {
  return asArray(queue?.tasks)
    .filter((task) => task.status === "open")
    .filter((task) => task.chapter === options.chapter);
}

function severityCount(items, severity) {
  return items.filter((item) => item.severity === severity).length;
}

function sourceFiles(files) {
  return files
    .filter((file) => file.exists)
    .map((file) => file.path);
}

function rebuildIndex() {
  const toolDir = path.dirname(fileURLToPath(import.meta.url));
  const buildIndexFile = path.join(toolDir, "build-index.mjs");
  if (!exists(buildIndexFile)) return;
  const result = spawnSync(process.execPath, [buildIndexFile, projectRoot, "--generated-at", options.generatedAt], {
    encoding: "utf8"
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error("Chapter gate wrote files, but index rebuild failed.");
  }
}

function promoteChapter(chapterRecord) {
  if (!options.promote) return "";
  chapterRecord.status = options.promote;
  chapterRecord.updated_at = options.generatedAt;
  writeJson(chapterRecordFile, chapterRecord);

  if (exists(projectFile)) {
    const project = readJson(projectFile);
    project.last_updated_chapter = Math.max(project.last_updated_chapter ?? 0, options.chapter);
    project.updated_at = options.generatedAt;
    writeJson(projectFile, project);
  }

  return options.promote;
}

const files = [
  { kind: "chapter_record", path: rel(chapterRecordFile), exists: exists(chapterRecordFile) },
  { kind: "manuscript", path: rel(manuscriptFile), exists: exists(manuscriptFile) },
  { kind: "brief", path: rel(briefFile), exists: exists(briefFile) },
  { kind: "extraction", path: rel(extractionFile), exists: exists(extractionFile) },
  { kind: "review", path: rel(reviewFile), exists: exists(reviewFile) },
  { kind: "action_queue", path: rel(queueFile), exists: exists(queueFile) },
  { kind: "index", path: rel(indexFile), exists: exists(indexFile) }
];

const blockers = [];
const warnings = [];

for (const file of files) {
  if (file.kind === "index") {
    if (!file.exists) warnings.push(issue("missing_index", "State index is missing; run /storyweaver:index after the gate.", file.path));
  } else if (!file.exists) {
    blockers.push(issue(`missing_${file.kind}`, `Required ${file.kind} file is missing.`, file.path));
  }
}

const chapterRecord = exists(chapterRecordFile) ? readJson(chapterRecordFile) : null;
const review = exists(reviewFile) ? readJson(reviewFile) : null;
const queue = exists(queueFile) ? readJson(queueFile) : null;
const manuscript = exists(manuscriptFile) ? readText(manuscriptFile) : "";
const actualWordCount = manuscript ? countWords(manuscript) : 0;
const paragraphCount = manuscript ? countParagraphs(manuscript) : 0;
const recordedWordCount = Number.isFinite(chapterRecord?.word_count) ? chapterRecord.word_count : 0;
const reviewSummary = review?.summary ?? {};
const queueTasks = openTasksForChapter(queue);

if (chapterRecord?.chapter !== undefined && chapterRecord.chapter !== options.chapter) {
  blockers.push(issue("chapter_record_mismatch", `Chapter record declares chapter ${chapterRecord.chapter}, expected ${options.chapter}.`, rel(chapterRecordFile)));
}
if (review?.chapter !== undefined && review.chapter !== options.chapter) {
  blockers.push(issue("review_mismatch", `Review declares chapter ${review.chapter}, expected ${options.chapter}.`, rel(reviewFile)));
}

for (const field of ["chapter_goal", "reader_promise", "conflict_axis", "turning_point", "summary"]) {
  const value = String(chapterRecord?.[field] ?? "").trim();
  if (!value) {
    blockers.push(issue(`missing_${field}`, `Chapter contract field ${field} is empty.`, rel(chapterRecordFile)));
  } else if (/待|占位|placeholder|todo/i.test(value)) {
    warnings.push(issue(`placeholder_${field}`, `Chapter contract field ${field} still looks provisional.`, rel(chapterRecordFile)));
  }
}

if (actualWordCount < options.minWords) {
  blockers.push(issue("manuscript_too_short", `Manuscript has ${actualWordCount} counted characters, below minimum ${options.minWords}.`, rel(manuscriptFile)));
}

if (actualWordCount > 0 && recordedWordCount > 0) {
  const drift = Math.abs(actualWordCount - recordedWordCount);
  const allowedDrift = Math.max(50, Math.ceil(actualWordCount * 0.1));
  if (drift > allowedDrift) {
    warnings.push(issue("word_count_drift", `Chapter record word_count ${recordedWordCount} differs from manuscript count ${actualWordCount}.`, rel(chapterRecordFile)));
  }
}

if (paragraphCount <= 1 && actualWordCount > 300) {
  warnings.push(issue("low_paragraph_count", "Manuscript has very few paragraph breaks for its length.", rel(manuscriptFile)));
}

if ((reviewSummary.critical_count ?? 0) > 0) {
  blockers.push(issue("review_has_critical", `Review has ${reviewSummary.critical_count} critical finding(s).`, rel(reviewFile)));
}
if (review && review.passed === false && (reviewSummary.critical_count ?? 0) === 0) {
  warnings.push(issue("review_not_passed", "Review is marked not passed even though it has no critical findings.", rel(reviewFile)));
}
if ((reviewSummary.warning_count ?? 0) > 0) {
  warnings.push(issue("review_has_warnings", `Review has ${reviewSummary.warning_count} warning finding(s).`, rel(reviewFile)));
}

const openCritical = severityCount(queueTasks, "critical");
const openWarning = severityCount(queueTasks, "warning");
const openInfo = severityCount(queueTasks, "info");
if (openCritical > 0) {
  blockers.push(issue("queue_has_critical", `Action queue has ${openCritical} open critical task(s) for this chapter.`, rel(queueFile)));
}
if (openWarning > 0) {
  warnings.push(issue("queue_has_warnings", `Action queue has ${openWarning} open warning task(s) for this chapter.`, rel(queueFile)));
}

const delta = chapterRecord?.state_delta ?? {};
const deltaTotal = [
  "characters",
  "items",
  "scenes",
  "organizations",
  "concepts",
  "timeline_events",
  "plot_threads",
  "relationships"
].reduce((sum, key) => sum + asArray(delta[key]).length, 0);
if (chapterRecord && chapterRecord.status !== "planned" && deltaTotal === 0) {
  warnings.push(issue("empty_state_delta", "Chapter has no state_delta references; confirm this chapter truly changes no tracked state.", rel(chapterRecordFile)));
}

const resultStatus = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "passed";
const score = Math.max(0, 100 - blockers.length * 25 - warnings.length * 5);
const gate = {
  chapter: options.chapter,
  generated_at: options.generatedAt,
  schema_version: "2.0",
  result: {
    status: resultStatus,
    passed: blockers.length === 0,
    score
  },
  metrics: {
    actual_word_count: actualWordCount,
    recorded_word_count: recordedWordCount,
    min_word_count: options.minWords,
    paragraph_count: paragraphCount,
    review_critical: reviewSummary.critical_count ?? 0,
    review_warning: reviewSummary.warning_count ?? 0,
    review_info: reviewSummary.info_count ?? 0,
    open_queue_critical: openCritical,
    open_queue_warning: openWarning,
    open_queue_info: openInfo
  },
  files,
  blockers,
  warnings,
  source_files: sourceFiles(files),
  promoted_to: ""
};

writeJson(gateFile, gate);

let promotionError = "";
if (options.promote) {
  if (blockers.length > 0) {
    promotionError = `Chapter gate is blocked; refusing to promote chapter ${options.chapter}.`;
  } else if (options.promote === "locked" && warnings.length > 0) {
    promotionError = `Chapter gate has warnings; refusing to lock chapter ${options.chapter}.`;
  } else {
    gate.promoted_to = promoteChapter(chapterRecord);
    writeJson(gateFile, gate);
  }
}

rebuildIndex();

console.log(`Wrote ${rel(gateFile)}`);
console.log(`Chapter ${options.chapter} gate: ${gate.result.status} (score ${gate.result.score})`);
if (promotionError) {
  throw new Error(promotionError);
}

