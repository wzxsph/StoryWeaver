import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function usage() {
  console.error("Usage: node tools/extract-chapter-facts.mjs <projectRoot> --chapter N [--apply] [--generated-at ISO]");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 3) usage();

const projectRoot = path.resolve(args[0]);
const options = {
  chapter: null,
  apply: false,
  generatedAt: new Date().toISOString()
};

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];
  if (arg === "--chapter") {
    options.chapter = Number(next);
    i += 1;
  } else if (arg === "--apply") {
    options.apply = true;
  } else if (arg === "--generated-at") {
    options.generatedAt = next;
    i += 1;
  } else {
    usage();
  }
}

if (!Number.isInteger(options.chapter) || options.chapter < 1) usage();

const stateRoot = path.join(projectRoot, "state");
const chapterRecordFile = path.join(stateRoot, "chapters", `chapter_${options.chapter}.json`);
const chapterDir = path.join(stateRoot, "chapters", `chapter_${options.chapter}`);
const manuscriptFile = path.join(projectRoot, "chapters", `chapter_${options.chapter}.txt`);
const extractionFile = path.join(chapterDir, "extraction.json");
const projectFile = path.join(stateRoot, "metadata", "project.json");

const entityConfigs = [
  { kind: "character", dir: "characters", deltaKey: "characters" },
  { kind: "item", dir: "items", deltaKey: "items" },
  { kind: "scene", dir: "scenes", deltaKey: "scenes" },
  { kind: "organization", dir: "organizations", deltaKey: "organizations" },
  { kind: "concept", dir: "concepts", deltaKey: "concepts" },
  { kind: "timeline_event", dir: "timeline", deltaKey: "timeline_events" },
  { kind: "plot_thread", dir: "plot_threads", deltaKey: "plot_threads" },
  { kind: "relationship", dir: "relationships", deltaKey: "relationships" }
];

const deltaKeys = entityConfigs.map((config) => config.deltaKey);

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

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
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

function displayName(kind, data) {
  if (data.name) return data.name;
  if (data.title) return data.title;
  if (data.basic_info?.name) return data.basic_info.name;
  if (kind === "relationship" && data.source_id && data.target_id) {
    return `${data.source_id} -> ${data.target_id}`;
  }
  return data.id ?? "";
}

function aliasesFor(kind, data) {
  const names = [
    data.id,
    data.name,
    data.title,
    data.basic_info?.name,
    ...(asArray(data.aliases)),
    ...(asArray(data.nicknames))
  ];

  if (kind === "relationship") {
    names.push(data.source_id, data.target_id);
  }

  return unique(names.map((value) => String(value ?? "").trim()).filter((value) => value.length >= 2));
}

function snippet(text, index, length) {
  const start = Math.max(0, index - 36);
  const end = Math.min(text.length, index + length + 36);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function findEvidence(text, alias) {
  const evidence = [];
  let start = 0;
  while (evidence.length < 3) {
    const index = text.indexOf(alias, start);
    if (index === -1) break;
    evidence.push({ alias, snippet: snippet(text, index, alias.length) });
    start = index + alias.length;
  }
  return evidence;
}

function countMentions(text, alias) {
  let count = 0;
  let start = 0;
  while (true) {
    const index = text.indexOf(alias, start);
    if (index === -1) return count;
    count += 1;
    start = index + alias.length;
  }
}

function loadEntities() {
  const entities = [];
  for (const config of entityConfigs) {
    for (const file of jsonFiles(path.join(stateRoot, config.dir))) {
      const data = readJson(file);
      if (!data.id) continue;
      entities.push({
        kind: config.kind,
        deltaKey: config.deltaKey,
        id: data.id,
        name: displayName(config.kind, data),
        source: rel(file),
        aliases: aliasesFor(config.kind, data)
      });
    }
  }
  return entities;
}

function detectMentionedEntities(text) {
  return loadEntities()
    .map((entity) => {
      const evidence = [];
      let mentions = 0;
      for (const alias of entity.aliases) {
        const aliasMentions = countMentions(text, alias);
        if (aliasMentions === 0) continue;
        mentions += aliasMentions;
        evidence.push(...findEvidence(text, alias));
      }
      return { ...entity, mentions, evidence: evidence.slice(0, 5) };
    })
    .filter((entity) => entity.mentions > 0)
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

function emptyDelta() {
  return Object.fromEntries(deltaKeys.map((key) => [key, []]));
}

function buildDelta(mentionedEntities) {
  const delta = emptyDelta();
  for (const entity of mentionedEntities) {
    delta[entity.deltaKey].push(entity.id);
  }
  for (const key of deltaKeys) {
    delta[key] = unique(delta[key]);
  }
  return delta;
}

function sentenceCandidates(text) {
  return text
    .split(/(?<=[。！？!?])\s*/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 6)
    .filter((line) => /[？?]|为什么|为何|怎么会|谁|何处|真相|秘密|谜/.test(line))
    .slice(0, 8)
    .map((line) => ({ text: line.slice(0, 120), source: rel(manuscriptFile) }));
}

function decision(code, message, source) {
  return { code, message, source };
}

function mergeDelta(current, suggestion) {
  const next = { ...emptyDelta(), ...(current ?? {}) };
  for (const key of deltaKeys) {
    next[key] = unique([...asArray(next[key]), ...asArray(suggestion[key])]);
  }
  return next;
}

function shortSummary(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.length > 120 ? `${cleaned.slice(0, 119)}...` : cleaned;
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
    throw new Error("Extraction wrote files, but index rebuild failed.");
  }
}

if (!exists(manuscriptFile)) {
  throw new Error(`Missing chapter manuscript: ${rel(manuscriptFile)}`);
}
if (!exists(chapterRecordFile)) {
  throw new Error(`Missing chapter record: ${rel(chapterRecordFile)}`);
}

const text = readText(manuscriptFile);
const chapterRecord = readJson(chapterRecordFile);
if (chapterRecord.chapter !== options.chapter) {
  throw new Error(`${rel(chapterRecordFile)} declares chapter ${chapterRecord.chapter}, expected ${options.chapter}`);
}

const mentionedEntities = detectMentionedEntities(text);
const deltaSuggestion = buildDelta(mentionedEntities);
const decisions = [];
if (mentionedEntities.filter((entity) => entity.kind === "character").length === 0) {
  decisions.push(decision("no_character_detected", "No existing character card was matched in the manuscript; confirm whether a new character card is needed.", rel(manuscriptFile)));
}
if (mentionedEntities.length === 0) {
  decisions.push(decision("no_entity_detected", "No existing state card was matched in the manuscript; extraction may need manual review.", rel(manuscriptFile)));
}

const extraction = {
  chapter: options.chapter,
  generated_at: options.generatedAt,
  schema_version: "2.0",
  source_files: [rel(manuscriptFile), rel(chapterRecordFile)],
  manuscript: {
    path: rel(manuscriptFile),
    word_count: countWords(text),
    paragraph_count: countParagraphs(text)
  },
  mentioned_entities: mentionedEntities.map((entity) => ({
    kind: entity.kind,
    id: entity.id,
    name: entity.name,
    source: entity.source,
    mentions: entity.mentions,
    evidence: entity.evidence
  })),
  state_delta_suggestion: deltaSuggestion,
  open_loop_candidates: sentenceCandidates(text),
  decisions_required: decisions,
  applied: false
};

if (options.apply) {
  chapterRecord.state_delta = mergeDelta(chapterRecord.state_delta, deltaSuggestion);
  chapterRecord.word_count = extraction.manuscript.word_count;
  if (!String(chapterRecord.summary ?? "").trim()) {
    chapterRecord.summary = shortSummary(text);
  }
  chapterRecord.updated_at = options.generatedAt;
  writeJson(chapterRecordFile, chapterRecord);

  if (exists(projectFile)) {
    const project = readJson(projectFile);
    project.updated_at = options.generatedAt;
    writeJson(projectFile, project);
  }

  extraction.applied = true;
}

writeJson(extractionFile, extraction);
rebuildIndex();

console.log(`Wrote ${rel(extractionFile)}`);
console.log(`Detected ${mentionedEntities.length} existing state entities in chapter ${options.chapter}`);

