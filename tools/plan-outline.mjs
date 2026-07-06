import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function usage() {
  console.error("Usage: node tools/plan-outline.mjs <projectRoot> --type outline|volume|chapter [--scope N|A-B] [--volume N] [--title TITLE] [--content TEXT] [--generated-at ISO] [--overwrite]");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 3) usage();

const projectRoot = path.resolve(args[0]);
const options = {
  type: "",
  scope: "",
  volume: 1,
  title: "",
  content: "",
  generatedAt: new Date().toISOString(),
  overwrite: false
};

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];
  if (arg === "--type") {
    options.type = next;
    i += 1;
  } else if (arg === "--scope") {
    options.scope = next;
    i += 1;
  } else if (arg === "--volume") {
    options.volume = Number(next);
    i += 1;
  } else if (arg === "--title") {
    options.title = next;
    i += 1;
  } else if (arg === "--content") {
    options.content = next;
    i += 1;
  } else if (arg === "--generated-at") {
    options.generatedAt = next;
    i += 1;
  } else if (arg === "--overwrite") {
    options.overwrite = true;
  } else {
    usage();
  }
}

if (!["outline", "volume", "chapter"].includes(options.type)) usage();
if (!Number.isInteger(options.volume) || options.volume < 1) usage();

const stateRoot = path.join(projectRoot, "state");
const outlineRoot = path.join(stateRoot, "outline");

function exists(file) {
  return fs.existsSync(file);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(file, data) {
  if (!options.overwrite && exists(file)) {
    throw new Error(`Refusing to overwrite ${rel(file)}. Pass --overwrite to replace the plan file.`);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function rel(file) {
  return path.relative(projectRoot, file).replaceAll(path.sep, "/");
}

function projectTitle() {
  const projectFile = path.join(stateRoot, "metadata", "project.json");
  if (!exists(projectFile)) return "";
  return readJson(projectFile).title ?? "";
}

function fallbackTitle(prefix, value) {
  if (options.title) return options.title;
  return `${prefix}${value ? ` ${value}` : ""}`;
}

function parseRange(scope, fallbackFrom = 1, fallbackTo = fallbackFrom) {
  if (!scope) return { from: fallbackFrom, to: fallbackTo };
  const match = String(scope).match(/^([0-9]+)(?:-([0-9]+))?$/);
  if (!match) usage();
  const from = Number(match[1]);
  const to = Number(match[2] ?? match[1]);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) usage();
  return { from, to };
}

function emptyDelta() {
  return {
    characters: [],
    items: [],
    scenes: [],
    organizations: [],
    concepts: [],
    timeline_events: [],
    plot_threads: [],
    relationships: []
  };
}

function textOrFallback(text, fallback) {
  const value = String(text ?? "").trim();
  return value || fallback;
}

function outlinePlan() {
  const title = fallbackTitle(projectTitle() || "Untitled Story", "");
  return {
    kind: "outline",
    generated_at: options.generatedAt,
    schema_version: "2.0",
    title,
    premise: textOrFallback(options.content, "待补全核心创意。"),
    logline: textOrFallback(options.content, "待补全一句话简介。"),
    synopsis: textOrFallback(options.content, "待补全整体故事大纲。"),
    themes: [],
    volumes: [{
      volume: 1,
      title: "第一卷",
      scope: "1-30",
      summary: "待补全分卷目标。",
      goal: "建立主角、金手指、核心冲突和第一阶段读者期待。"
    }]
  };
}

function volumePlan() {
  const scope = parseRange(options.scope, 1, 30);
  const chapters = [];
  for (let chapter = scope.from; chapter <= scope.to; chapter += 1) {
    chapters.push({
      chapter,
      title: `第${chapter}章`,
      chapter_goal: "待补全本章目标。",
      turning_point: "待补全本章转折。",
      status: "planned"
    });
  }

  return {
    kind: "volume",
    generated_at: options.generatedAt,
    schema_version: "2.0",
    volume: options.volume,
    title: fallbackTitle(`第${options.volume}卷`, ""),
    scope,
    summary: textOrFallback(options.content, "待补全分卷概要。"),
    arc_goal: textOrFallback(options.content, "待补全分卷主线目标。"),
    chapters
  };
}

function chapterPlan(chapter) {
  const summary = textOrFallback(options.content, "待补全章节概要。");
  return {
    kind: "chapter",
    generated_at: options.generatedAt,
    schema_version: "2.0",
    chapter,
    title: options.title || `第${chapter}章`,
    chapter_goal: summary,
    reader_promise: "待补全本章读者承诺。",
    conflict_axis: "待补全本章主要冲突。",
    turning_point: "待补全本章不可逆转折。",
    summary,
    scene_beats: [],
    state_delta_plan: emptyDelta()
  };
}

function chapterContractFromPlan(plan) {
  return {
    chapter: plan.chapter,
    title: plan.title,
    status: "planned",
    chapter_goal: plan.chapter_goal,
    reader_promise: plan.reader_promise,
    conflict_axis: plan.conflict_axis,
    turning_point: plan.turning_point,
    summary: plan.summary,
    word_count: 0,
    style_tags: [],
    open_loops_introduced: [],
    open_loops_advanced: [],
    open_loops_resolved: [],
    state_delta: plan.state_delta_plan,
    created_at: options.generatedAt,
    updated_at: options.generatedAt,
    schema_version: "2.0"
  };
}

if (!exists(stateRoot)) {
  throw new Error(`Missing state directory: ${stateRoot}. Run /storyweaver:init first.`);
}

let outputFile = "";
if (options.type === "outline") {
  outputFile = path.join(outlineRoot, "outline.json");
  writeJson(outputFile, outlinePlan());
} else if (options.type === "volume") {
  outputFile = path.join(outlineRoot, `volume_${options.volume}.json`);
  writeJson(outputFile, volumePlan());
} else {
  const { from, to } = parseRange(options.scope, 1, 1);
  if (from !== to) usage();
  const plan = chapterPlan(from);
  outputFile = path.join(outlineRoot, `chapter_${from}.json`);
  writeJson(outputFile, plan);

  const contractFile = path.join(stateRoot, "chapters", `chapter_${from}.json`);
  writeJson(contractFile, chapterContractFromPlan(plan));
}

const toolDir = path.dirname(fileURLToPath(import.meta.url));
for (const tool of ["build-index.mjs", "build-action-queue.mjs"]) {
  const result = spawnSync(process.execPath, [path.join(toolDir, tool), projectRoot, "--generated-at", options.generatedAt], {
    encoding: "utf8"
  });
  if (result.status !== 0) {
    if (result.stderr || result.stdout) process.stderr.write(result.stderr || result.stdout);
    throw new Error(`${tool} failed after writing ${rel(outputFile)}.`);
  }
  if (result.stdout) process.stdout.write(result.stdout);
}

console.log(`Wrote ${rel(outputFile)}`);

