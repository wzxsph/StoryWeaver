import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error("Usage: node tools/build-brief.mjs <projectRoot> --chapter N [--words 3000] [--max-context-items 24] [--mode write] [--instructions text] [--generated-at ISO]");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 3) usage();

const projectRoot = path.resolve(args[0]);
const options = {
  chapter: null,
  words: 3000,
  maxContextItems: 24,
  mode: "write",
  instructions: "",
  generatedAt: new Date().toISOString()
};

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];
  if (arg === "--chapter") {
    options.chapter = Number(next);
    i += 1;
  } else if (arg === "--words") {
    options.words = Number(next);
    i += 1;
  } else if (arg === "--max-context-items") {
    options.maxContextItems = Number(next);
    i += 1;
  } else if (arg === "--mode") {
    options.mode = next;
    i += 1;
  } else if (arg === "--instructions") {
    options.instructions = next;
    i += 1;
  } else if (arg === "--generated-at") {
    options.generatedAt = next;
    i += 1;
  } else {
    usage();
  }
}

if (!Number.isInteger(options.chapter) || options.chapter < 1) usage();

const stateRoot = path.join(projectRoot, "state");

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

function loadDir(dir) {
  const fullDir = path.join(stateRoot, dir);
  if (!fs.existsSync(fullDir)) return new Map();
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  const map = new Map();
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const file = path.join(fullDir, entry.name);
    const data = readJson(file);
    if (data.id) map.set(data.id, { file, data });
  }
  return map;
}

function loadChapter(chapter) {
  const file = path.join(stateRoot, "chapters", `chapter_${chapter}.json`);
  return exists(file) ? { file, data: readJson(file) } : null;
}

function loadTimelineEvents() {
  return loadDir("timeline");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function truncate(text, max = 180) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function addSource(sources, file) {
  if (file && exists(file)) sources.add(rel(file));
}

function contextItem(kind, entity, summary, priority = 5) {
  return {
    kind,
    id: entity?.data?.id ?? null,
    name: entity?.data?.name ?? entity?.data?.title ?? "",
    summary: truncate(summary),
    source: entity ? rel(entity.file) : "",
    priority
  };
}

function pushLimited(target, item, maxItems) {
  if (!item?.summary) return;
  if (target.length >= maxItems) return;
  target.push(item);
}

function entityFilesFromIds(map, ids, sources) {
  for (const id of ids) {
    addSource(sources, map.get(id)?.file);
  }
}

const chapterRecord = loadChapter(options.chapter);
if (!chapterRecord) {
  throw new Error(`Missing chapter contract: state/chapters/chapter_${options.chapter}.json. Run /storyweaver:plan --type chapter --scope ${options.chapter} first or create a draft chapter contract.`);
}

const projectFile = path.join(stateRoot, "metadata", "project.json");
const project = exists(projectFile) ? readJson(projectFile) : {};
const characters = loadDir("characters");
const items = loadDir("items");
const scenes = loadDir("scenes");
const organizations = loadDir("organizations");
const concepts = loadDir("concepts");
const events = loadTimelineEvents();
const plotThreads = loadDir("plot_threads");
const relationships = loadDir("relationships");

const contract = chapterRecord.data;
const delta = contract.state_delta ?? {};
const mustInclude = {
  characters: asArray(delta.characters),
  items: asArray(delta.items),
  scenes: asArray(delta.scenes),
  organizations: asArray(delta.organizations),
  concepts: asArray(delta.concepts),
  timeline_events: asArray(delta.timeline_events),
  plot_threads: asArray(delta.plot_threads),
  relationships: asArray(delta.relationships)
};

const sources = new Set();
addSource(sources, projectFile);
addSource(sources, chapterRecord.file);
entityFilesFromIds(characters, mustInclude.characters, sources);
entityFilesFromIds(items, mustInclude.items, sources);
entityFilesFromIds(scenes, mustInclude.scenes, sources);
entityFilesFromIds(organizations, mustInclude.organizations, sources);
entityFilesFromIds(concepts, mustInclude.concepts, sources);
entityFilesFromIds(events, mustInclude.timeline_events, sources);
entityFilesFromIds(plotThreads, mustInclude.plot_threads, sources);
entityFilesFromIds(relationships, mustInclude.relationships, sources);

const perTierLimit = Math.max(1, Math.ceil(options.maxContextItems / 4));
const p0 = [];
const p1 = [];
const p2 = [];
const p3 = [];

pushLimited(p0, {
  kind: "project",
  id: null,
  name: project.title ?? "",
  summary: truncate(`${project.genre?.join("、") || "未分类"}；文风：${project.style || "未指定"}；本章读者承诺：${contract.reader_promise || "未填写"}`),
  source: rel(projectFile),
  priority: 10
}, perTierLimit);

for (const id of mustInclude.concepts) {
  const entity = concepts.get(id);
  if (!entity) continue;
  const data = entity.data;
  pushLimited(p0, contextItem("concept", entity, `${data.definition || data.name} ${asArray(data.rules).join("；")}`, data.status === "locked" ? 10 : 8), perTierLimit);
}

for (const id of mustInclude.organizations) {
  const entity = organizations.get(id);
  if (!entity) continue;
  const data = entity.data;
  pushLimited(p0, contextItem("organization", entity, `${data.public_face || data.name}；资源：${asArray(data.resources).join("、")}；隐忧：${asArray(data.fears).join("、")}`, 7), perTierLimit);
}

for (const id of mustInclude.characters) {
  const entity = characters.get(id);
  if (!entity) continue;
  const data = entity.data;
  const state = data.current_state ?? {};
  pushLimited(p1, contextItem("character", entity, `${data.name} 当前在 ${state.location?.current || "未知地点"}，情绪 ${state.emotional_state || "未知"}，状态 ${state.physical_state || "未知"}，目标：${asArray(data.core_identity?.goals).join("、")}`, 10), perTierLimit);
}

for (const id of mustInclude.items) {
  const entity = items.get(id);
  if (!entity) continue;
  const data = entity.data;
  pushLimited(p1, contextItem("item", entity, `${data.name} 当前状态：${data.current_state || "未知"}；持有者：${data.current_holder || "未知"}；能力：${asArray(data.abilities).join("、")}；限制：${asArray(data.limitations).join("、")}`, 9), perTierLimit);
}

for (const id of mustInclude.scenes) {
  const entity = scenes.get(id);
  if (!entity) continue;
  const data = entity.data;
  pushLimited(p1, contextItem("scene", entity, `${data.name}：${data.description || ""}；氛围：${data.dynamic_state?.atmosphere || "未知"}；功能：${data.function_in_story || "未定义"}`, 8), perTierLimit);
}

for (let n = Math.max(1, options.chapter - 3); n < options.chapter; n += 1) {
  const previous = loadChapter(n);
  if (!previous) continue;
  addSource(sources, previous.file);
  pushLimited(p2, {
    kind: "chapter",
    id: null,
    name: `第${n}章`,
    summary: truncate(previous.data.summary || previous.data.chapter_goal || previous.data.title || `第${n}章记录`),
    source: rel(previous.file),
    priority: 8
  }, perTierLimit);
}

for (const id of mustInclude.timeline_events) {
  const entity = events.get(id);
  if (!entity) continue;
  const data = entity.data;
  pushLimited(p2, contextItem("timeline_event", entity, `第${data.chapter}章：${data.description || data.title}；后果：${asArray(data.consequences).join("、")}`, 8), perTierLimit);
}

for (const id of mustInclude.relationships) {
  const entity = relationships.get(id);
  if (!entity) continue;
  const data = entity.data;
  pushLimited(p2, contextItem("relationship", entity, `${data.source_id} -> ${data.target_id}：${data.relationship_type}；证据：${asArray(data.evidence).join("；")}`, 6), perTierLimit);
}

for (const id of mustInclude.plot_threads) {
  const entity = plotThreads.get(id);
  if (!entity) continue;
  const data = entity.data;
  pushLimited(p3, contextItem("plot_thread", entity, `${data.name}（${data.status}，${data.progress ?? 0}%）：${data.description || ""}`, data.status === "active" ? 8 : 6), perTierLimit);
}

for (const loop of asArray(contract.open_loops_introduced).concat(asArray(contract.open_loops_advanced))) {
  pushLimited(p3, {
    kind: "open_loop",
    id: null,
    name: "未解钩子",
    summary: truncate(loop),
    source: rel(chapterRecord.file),
    priority: 7
  }, perTierLimit);
}

const writingDirectives = [
  contract.chapter_goal ? `完成章节目标：${contract.chapter_goal}` : "",
  contract.reader_promise ? `兑现读者承诺：${contract.reader_promise}` : "",
  contract.conflict_axis ? `围绕冲突轴推进：${contract.conflict_axis}` : "",
  contract.turning_point ? `必须出现不可逆转折：${contract.turning_point}` : "",
  options.instructions ? `额外要求：${options.instructions}` : ""
].filter(Boolean);

const exclusions = [
  ...asArray(contract.open_loops_resolved).map((loop) => `不要重复解决已关闭钩子：${loop}`),
  "不要改写 P0 锁定设定。",
  "不要引入 brief 未列入且用户未授权的重大新实体。"
];

const openQuestions = [
  ...asArray(contract.open_loops_introduced),
  ...asArray(contract.open_loops_advanced)
];

const brief = {
  chapter: options.chapter,
  generated_at: options.generatedAt,
  purpose: `为第${options.chapter}章${options.mode}提供可审计的 P0-P3 上下文`,
  source_files: Array.from(sources).sort(),
  context_budget: {
    target_words: options.words,
    max_context_items: options.maxContextItems
  },
  p0,
  p1,
  p2,
  p3,
  must_include: mustInclude,
  writing_directives: writingDirectives,
  exclusions,
  open_questions: openQuestions
};

const briefFile = path.join(stateRoot, "chapters", `chapter_${options.chapter}`, "brief.json");
writeJson(briefFile, brief);
console.log(`Wrote ${rel(briefFile)}`);
