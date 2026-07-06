import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function usage() {
  console.error(`Usage:
  node tools/manage-story-graph.mjs <projectRoot> timeline list [--chapter N] [--character ID_OR_NAME] [--plot ID_OR_NAME] [--json]
  node tools/manage-story-graph.mjs <projectRoot> timeline view (--id ID | --title TITLE)
  node tools/manage-story-graph.mjs <projectRoot> timeline add --title TITLE --chapter N --description TEXT [--timestamp TEXT] [--location TEXT] [--participants IDS] [--items IDS] [--plot ID_OR_NAME] [--consequences CSV] [--id event_###]

  node tools/manage-story-graph.mjs <projectRoot> plot list [--status active|dormant|completed|abandoned] [--json]
  node tools/manage-story-graph.mjs <projectRoot> plot view (--id ID | --name NAME)
  node tools/manage-story-graph.mjs <projectRoot> plot add --name NAME [--description TEXT] [--status active] [--progress N] [--chapter N] [--id plot_###]
  node tools/manage-story-graph.mjs <projectRoot> plot update (--id ID | --name NAME) --field status|progress|description|related_events --value VALUE [--chapter N]

  node tools/manage-story-graph.mjs <projectRoot> relationship list [--source ID_OR_NAME] [--target ID_OR_NAME] [--json]
  node tools/manage-story-graph.mjs <projectRoot> relationship view --id ID
  node tools/manage-story-graph.mjs <projectRoot> relationship add --source ID_OR_NAME --target ID_OR_NAME --type TYPE [--strength N] [--evidence CSV] [--chapter N] [--id rel_###]
  node tools/manage-story-graph.mjs <projectRoot> relationship update --id ID --field relationship_type|strength|evidence --value VALUE [--chapter N]`);
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 3) usage();

const projectRoot = path.resolve(args[0]);
const kindArg = args[1];
const action = args[2];
const options = {
  id: "",
  title: "",
  name: "",
  description: "",
  timestamp: "",
  location: "",
  participants: "",
  items: "",
  plot: "",
  character: "",
  source: "",
  target: "",
  type: "",
  status: "",
  progress: null,
  strength: null,
  evidence: "",
  consequences: "",
  chapter: null,
  field: "",
  value: "",
  json: false
};

for (let i = 3; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];
  if (arg === "--id") {
    options.id = next ?? "";
    i += 1;
  } else if (arg === "--title") {
    options.title = next ?? "";
    i += 1;
  } else if (arg === "--name") {
    options.name = next ?? "";
    i += 1;
  } else if (arg === "--description") {
    options.description = next ?? "";
    i += 1;
  } else if (arg === "--timestamp") {
    options.timestamp = next ?? "";
    i += 1;
  } else if (arg === "--location") {
    options.location = next ?? "";
    i += 1;
  } else if (arg === "--participants") {
    options.participants = next ?? "";
    i += 1;
  } else if (arg === "--items") {
    options.items = next ?? "";
    i += 1;
  } else if (arg === "--plot") {
    options.plot = next ?? "";
    i += 1;
  } else if (arg === "--character") {
    options.character = next ?? "";
    i += 1;
  } else if (arg === "--source") {
    options.source = next ?? "";
    i += 1;
  } else if (arg === "--target") {
    options.target = next ?? "";
    i += 1;
  } else if (arg === "--type") {
    options.type = next ?? "";
    i += 1;
  } else if (arg === "--status") {
    options.status = next ?? "";
    i += 1;
  } else if (arg === "--progress") {
    options.progress = Number(next);
    i += 1;
  } else if (arg === "--strength") {
    options.strength = Number(next);
    i += 1;
  } else if (arg === "--evidence") {
    options.evidence = next ?? "";
    i += 1;
  } else if (arg === "--consequences") {
    options.consequences = next ?? "";
    i += 1;
  } else if (arg === "--chapter") {
    options.chapter = Number(next);
    i += 1;
  } else if (arg === "--field") {
    options.field = next ?? "";
    i += 1;
  } else if (arg === "--value") {
    options.value = next ?? "";
    i += 1;
  } else if (arg === "--json") {
    options.json = true;
  } else {
    usage();
  }
}

const kindAliases = {
  event: "timeline",
  events: "timeline",
  timeline: "timeline",
  plot: "plot",
  plots: "plot",
  plot_thread: "plot",
  plot_threads: "plot",
  relationship: "relationship",
  relationships: "relationship",
  rel: "relationship"
};

const kind = kindAliases[kindArg];
if (!kind) usage();
if (!["list", "view", "add", "update"].includes(action)) usage();
if (options.chapter !== null && (!Number.isInteger(options.chapter) || options.chapter < 1)) usage();
if (options.progress !== null && !Number.isFinite(options.progress)) usage();
if (options.strength !== null && !Number.isFinite(options.strength)) usage();

const configs = {
  timeline: { dir: "timeline", prefix: "event" },
  plot: { dir: "plot_threads", prefix: "plot" },
  relationship: { dir: "relationships", prefix: "rel" }
};

const entityConfigs = [
  { kind: "character", dir: "characters" },
  { kind: "item", dir: "items" },
  { kind: "scene", dir: "scenes" },
  { kind: "organization", dir: "organizations" },
  { kind: "concept", dir: "concepts" },
  { kind: "event", dir: "timeline" },
  { kind: "plot", dir: "plot_threads" }
];

const plotStatuses = new Set(["active", "dormant", "completed", "abandoned"]);
const stateRoot = path.join(projectRoot, "state");
const graphDir = path.join(stateRoot, configs[kind].dir);

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

function jsonFiles(dir) {
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function parseList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateId(prefix, id) {
  const pattern = new RegExp(`^${prefix}_[0-9]{3,}$`);
  if (!pattern.test(id)) throw new Error(`Invalid ${prefix} id: ${id}`);
}

function loadRecords(recordKind) {
  const config = configs[recordKind];
  const dir = path.join(stateRoot, config.dir);
  return jsonFiles(dir).map((file) => ({ file, data: readJson(file) }));
}

function nextId(recordKind, records) {
  const config = configs[recordKind];
  if (options.id) {
    validateId(config.prefix, options.id);
    return options.id;
  }
  const max = records
    .map(({ data }) => Number(String(data.id ?? "").replace(`${config.prefix}_`, "")))
    .filter(Number.isFinite)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${config.prefix}_${String(max + 1).padStart(3, "0")}`;
}

function loadEntityIndex() {
  const byId = new Map();
  const byName = [];
  for (const config of entityConfigs) {
    const dir = path.join(stateRoot, config.dir);
    for (const file of jsonFiles(dir)) {
      const data = readJson(file);
      if (!data.id) continue;
      const entry = {
        id: data.id,
        name: data.name ?? data.title ?? "",
        kind: config.kind,
        file,
        data
      };
      byId.set(entry.id, entry);
      if (entry.name) byName.push(entry);
    }
  }
  return { byId, byName };
}

function resolveEntity(input, allowedKinds, label) {
  const value = String(input ?? "").trim();
  if (!value) return null;
  const index = loadEntityIndex();
  const allowed = new Set(allowedKinds);
  const byId = index.byId.get(value);
  if (byId) {
    if (!allowed.has(byId.kind)) {
      throw new Error(`${label} ${value} must be one of: ${allowedKinds.join(", ")}`);
    }
    return byId;
  }

  const matches = index.byName.filter((entry) => allowed.has(entry.kind) && entry.name === value);
  if (matches.length === 0) throw new Error(`Could not resolve ${label}: ${value}`);
  if (matches.length > 1) {
    throw new Error(`Ambiguous ${label} ${value}; use an id instead.`);
  }
  return matches[0];
}

function resolveEntityList(value, allowedKinds, label) {
  return parseList(value).map((item) => resolveEntity(item, allowedKinds, label).id);
}

function findRecord(records) {
  if (options.id) return records.find(({ data }) => data.id === options.id);
  if (kind === "timeline" && options.title) return records.find(({ data }) => data.title === options.title);
  if (kind === "plot" && options.name) return records.find(({ data }) => data.name === options.name);
  usage();
}

function ensureChapterRecord(chapter) {
  const file = path.join(stateRoot, "chapters", `chapter_${chapter}.json`);
  if (!exists(file)) {
    throw new Error(`Chapter ${chapter} has no contract: ${rel(file)}. Run /storyweaver:plan --type chapter --scope ${chapter} first.`);
  }
  return file;
}

function appendUnique(array, value) {
  if (!array.includes(value)) array.push(value);
}

function appendToChapterDelta(chapter, key, id) {
  const chapterFile = ensureChapterRecord(chapter);
  const data = readJson(chapterFile);
  data.state_delta = data.state_delta ?? {};
  data.state_delta[key] = Array.isArray(data.state_delta[key]) ? data.state_delta[key] : [];
  appendUnique(data.state_delta[key], id);
  writeJson(chapterFile, data);
}

function rebuildIndex() {
  const toolDir = path.dirname(fileURLToPath(import.meta.url));
  const buildIndexFile = path.join(toolDir, "build-index.mjs");
  if (!exists(buildIndexFile)) return;
  const result = spawnSync(process.execPath, [buildIndexFile, projectRoot], { encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error("Story graph operation succeeded, but index rebuild failed.");
  }
}

function printRows(rows, emptyMessage) {
  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (rows.length === 0) {
    console.log(emptyMessage);
    return;
  }
  for (const row of rows) {
    console.log(Object.values(row).join("\t"));
  }
}

function listTimeline(records) {
  const character = options.character ? resolveEntity(options.character, ["character"], "character") : null;
  const plot = options.plot ? resolveEntity(options.plot, ["plot"], "plot thread") : null;
  const rows = records
    .filter(({ data }) => options.chapter === null || data.chapter === options.chapter)
    .filter(({ data }) => !character || (data.participants ?? []).includes(character.id))
    .filter(({ data }) => !plot || data.plot_thread_id === plot.id)
    .sort((a, b) => (a.data.chapter ?? 0) - (b.data.chapter ?? 0) || a.data.id.localeCompare(b.data.id))
    .map(({ file, data }) => ({
      id: data.id,
      chapter: data.chapter,
      title: data.title,
      plot_thread_id: data.plot_thread_id ?? "",
      participants: (data.participants ?? []).join(","),
      source: rel(file)
    }));
  printRows(rows, "No timeline events found.");
}

function listPlots(records) {
  const rows = records
    .filter(({ data }) => !options.status || data.status === options.status)
    .sort((a, b) => a.data.status.localeCompare(b.data.status) || a.data.id.localeCompare(b.data.id))
    .map(({ file, data }) => ({
      id: data.id,
      name: data.name,
      status: data.status,
      progress: data.progress,
      last_updated_chapter: data.last_updated_chapter ?? "",
      source: rel(file)
    }));
  printRows(rows, "No plot threads found.");
}

function listRelationships(records) {
  const source = options.source ? resolveEntity(options.source, ["character", "item", "scene", "organization", "concept", "event", "plot"], "source") : null;
  const target = options.target ? resolveEntity(options.target, ["character", "item", "scene", "organization", "concept", "event", "plot"], "target") : null;
  const rows = records
    .filter(({ data }) => !source || data.source_id === source.id)
    .filter(({ data }) => !target || data.target_id === target.id)
    .sort((a, b) => a.data.id.localeCompare(b.data.id))
    .map(({ file, data }) => ({
      id: data.id,
      source_id: data.source_id,
      target_id: data.target_id,
      relationship_type: data.relationship_type,
      strength: data.strength ?? "",
      source: rel(file)
    }));
  printRows(rows, "No relationships found.");
}

function addTimeline(records) {
  if (!options.title.trim() || !options.description.trim() || options.chapter === null) usage();
  ensureChapterRecord(options.chapter);
  if (records.some(({ data }) => data.title === options.title && data.chapter === options.chapter)) {
    throw new Error(`Timeline event already exists in chapter ${options.chapter}: ${options.title}`);
  }

  const id = nextId("timeline", records);
  const file = path.join(graphDir, `${id}.json`);
  if (exists(file)) throw new Error(`Refusing to overwrite existing event: ${rel(file)}`);

  const plot = options.plot ? resolveEntity(options.plot, ["plot"], "plot thread") : null;
  const data = {
    id,
    title: options.title,
    chapter: options.chapter,
    timestamp: options.timestamp,
    location: options.location,
    participants: resolveEntityList(options.participants, ["character"], "participant"),
    related_items: resolveEntityList(options.items, ["item"], "related item"),
    plot_thread_id: plot?.id ?? null,
    description: options.description,
    consequences: parseList(options.consequences)
  };

  writeJson(file, data);
  console.log(`Wrote ${rel(file)}`);
  appendToChapterDelta(options.chapter, "timeline_events", id);

  if (plot) {
    const plotData = plot.data;
    plotData.related_events = Array.isArray(plotData.related_events) ? plotData.related_events : [];
    appendUnique(plotData.related_events, id);
    plotData.last_updated_chapter = Math.max(plotData.last_updated_chapter ?? 0, options.chapter);
    writeJson(plot.file, plotData);
    console.log(`Updated ${rel(plot.file)}`);
  }

  rebuildIndex();
}

function addPlot(records) {
  if (!options.name.trim()) usage();
  if (records.some(({ data }) => data.name === options.name)) {
    throw new Error(`Plot thread already exists with name: ${options.name}`);
  }
  const status = options.status || "active";
  if (!plotStatuses.has(status)) throw new Error(`Unsupported plot status: ${status}`);
  const id = nextId("plot", records);
  const file = path.join(graphDir, `${id}.json`);
  if (exists(file)) throw new Error(`Refusing to overwrite existing plot thread: ${rel(file)}`);

  const data = {
    id,
    name: options.name,
    status,
    progress: options.progress ?? 0,
    description: options.description,
    related_events: []
  };
  if (options.chapter !== null) {
    ensureChapterRecord(options.chapter);
    data.started_chapter = options.chapter;
    data.last_updated_chapter = options.chapter;
  }

  writeJson(file, data);
  console.log(`Wrote ${rel(file)}`);
  if (options.chapter !== null) appendToChapterDelta(options.chapter, "plot_threads", id);
  rebuildIndex();
}

function updatePlot(record) {
  if (!options.field) usage();
  const data = record.data;
  if (options.field === "status") {
    if (!plotStatuses.has(options.value)) throw new Error(`Unsupported plot status: ${options.value}`);
    data.status = options.value;
  } else if (options.field === "progress") {
    const progress = Number(options.value);
    if (!Number.isFinite(progress) || progress < 0) throw new Error(`Invalid progress: ${options.value}`);
    data.progress = progress;
  } else if (options.field === "description") {
    data.description = options.value;
  } else if (options.field === "related_events") {
    data.related_events = resolveEntityList(options.value, ["event"], "related event");
  } else {
    throw new Error(`Unsupported plot update field: ${options.field}`);
  }
  if (options.chapter !== null) {
    ensureChapterRecord(options.chapter);
    data.last_updated_chapter = Math.max(data.last_updated_chapter ?? 0, options.chapter);
  }
  writeJson(record.file, data);
  console.log(`Wrote ${rel(record.file)}`);
  if (options.chapter !== null) appendToChapterDelta(options.chapter, "plot_threads", data.id);
  rebuildIndex();
}

function linkCharacterRelationship(source, targetId, relationshipType, strength, chapter) {
  if (!source || source.kind !== "character") return;
  const data = source.data;
  data.relationship_map = data.relationship_map ?? {};
  data.relationship_map[targetId] = {
    target_id: targetId,
    relationship_type: relationshipType,
    strength,
    last_updated_chapter: chapter ?? data.last_updated_chapter ?? 0
  };
  data.last_updated_chapter = Math.max(data.last_updated_chapter ?? 0, chapter ?? 0);
  writeJson(source.file, data);
  console.log(`Updated ${rel(source.file)}`);
}

function addRelationship(records) {
  if (!options.source.trim() || !options.target.trim() || !options.type.trim()) usage();
  const source = resolveEntity(options.source, ["character", "item", "scene", "organization", "concept", "event", "plot"], "source");
  const target = resolveEntity(options.target, ["character", "item", "scene", "organization", "concept", "event", "plot"], "target");
  if (source.id === target.id) throw new Error("Relationship source and target must be different.");
  if (records.some(({ data }) => data.source_id === source.id && data.target_id === target.id && data.relationship_type === options.type)) {
    throw new Error(`Relationship already exists: ${source.id} -> ${target.id} (${options.type})`);
  }

  if (options.chapter !== null) ensureChapterRecord(options.chapter);
  const id = nextId("relationship", records);
  const file = path.join(graphDir, `${id}.json`);
  if (exists(file)) throw new Error(`Refusing to overwrite existing relationship: ${rel(file)}`);

  const data = {
    id,
    source_id: source.id,
    target_id: target.id,
    relationship_type: options.type,
    strength: options.strength ?? 0,
    evidence: parseList(options.evidence),
    last_updated_chapter: options.chapter ?? 0
  };
  writeJson(file, data);
  console.log(`Wrote ${rel(file)}`);
  linkCharacterRelationship(source, target.id, data.relationship_type, data.strength, options.chapter);
  if (options.chapter !== null) appendToChapterDelta(options.chapter, "relationships", id);
  rebuildIndex();
}

function updateRelationship(record) {
  if (!options.field) usage();
  const data = record.data;
  if (options.field === "relationship_type" || options.field === "type") {
    data.relationship_type = options.value;
  } else if (options.field === "strength") {
    const strength = Number(options.value);
    if (!Number.isFinite(strength)) throw new Error(`Invalid strength: ${options.value}`);
    data.strength = strength;
  } else if (options.field === "evidence") {
    data.evidence = parseList(options.value);
  } else {
    throw new Error(`Unsupported relationship update field: ${options.field}`);
  }
  if (options.chapter !== null) {
    ensureChapterRecord(options.chapter);
    data.last_updated_chapter = Math.max(data.last_updated_chapter ?? 0, options.chapter);
  }
  writeJson(record.file, data);
  console.log(`Wrote ${rel(record.file)}`);

  const source = resolveEntity(data.source_id, ["character", "item", "scene", "organization", "concept", "event", "plot"], "source");
  linkCharacterRelationship(source, data.target_id, data.relationship_type, data.strength ?? 0, options.chapter);
  if (options.chapter !== null) appendToChapterDelta(options.chapter, "relationships", data.id);
  rebuildIndex();
}

fs.mkdirSync(graphDir, { recursive: true });
const records = loadRecords(kind);

if (action === "list") {
  if (kind === "timeline") listTimeline(records);
  if (kind === "plot") listPlots(records);
  if (kind === "relationship") listRelationships(records);
} else if (action === "view") {
  const record = findRecord(records);
  if (!record) throw new Error(`No ${kind} record matched the query.`);
  console.log(JSON.stringify(record.data, null, 2));
} else if (action === "add") {
  if (kind === "timeline") addTimeline(records);
  if (kind === "plot") addPlot(records);
  if (kind === "relationship") addRelationship(records);
} else if (action === "update") {
  const record = findRecord(records);
  if (!record) throw new Error(`No ${kind} record matched the query.`);
  if (kind === "plot") updatePlot(record);
  if (kind === "relationship") updateRelationship(record);
  if (kind === "timeline") throw new Error("Timeline updates are intentionally handled as append-only events. Add a follow-up event instead.");
}

