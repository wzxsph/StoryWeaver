import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function usage() {
  console.error("Usage: node tools/import-manuscript.mjs <projectRoot> --input PATH [--title TITLE] [--author AUTHOR] [--start N] [--status draft|planned] [--generated-at ISO] [--overwrite]");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 3) usage();

const projectRoot = path.resolve(args[0]);
const options = {
  input: "",
  title: "",
  author: "",
  start: 1,
  status: "draft",
  generatedAt: new Date().toISOString(),
  overwrite: false
};

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];
  if (arg === "--input") {
    options.input = next;
    i += 1;
  } else if (arg === "--title") {
    options.title = next;
    i += 1;
  } else if (arg === "--author") {
    options.author = next;
    i += 1;
  } else if (arg === "--start") {
    options.start = Number(next);
    i += 1;
  } else if (arg === "--status") {
    options.status = next;
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

if (!options.input || !Number.isInteger(options.start) || options.start < 1) usage();
if (!["draft", "planned"].includes(options.status)) usage();

const inputPath = path.isAbsolute(options.input)
  ? options.input
  : path.resolve(projectRoot, options.input);

function exists(file) {
  return fs.existsSync(file);
}

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function writeText(file, text) {
  assertWritable(file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

function writeJson(file, data, force = false) {
  if (!force) assertWritable(file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function assertWritable(file) {
  if (!options.overwrite && exists(file)) {
    throw new Error(`Refusing to overwrite ${rel(file)}. Pass --overwrite to replace generated import files.`);
  }
}

function rel(file) {
  return path.relative(projectRoot, file).replaceAll(path.sep, "/");
}

function displayPath(file) {
  if (file.startsWith(projectRoot)) return rel(file);
  return file.replaceAll(path.sep, "/");
}

function stripMarkdownHeading(line) {
  return line.replace(/^#+\s*/, "").trim();
}

function titleFromFile(file) {
  return path.basename(file, path.extname(file)).replace(/[_-]+/g, " ").trim();
}

function countWords(text) {
  return text.replace(/\s+/g, "").length;
}

function snippet(text, max = 120) {
  const value = text
    .split("\n")
    .map((line) => stripMarkdownHeading(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function makeEmptyDelta() {
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

function headingRegex(line) {
  return /^(第[零〇一二三四五六七八九十百千万两0-9]+[章节回篇卷集部][^\n]{0,60}|chapter\s+[0-9]+[^\n]{0,60})$/i.test(stripMarkdownHeading(line));
}

function splitFile(file) {
  const text = readText(file).trim();
  if (!text) return [];

  const lines = text.split("\n");
  const starts = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line && headingRegex(line)) starts.push(i);
  }

  if (starts.length === 0) {
    return [{
      title: titleFromFile(file),
      text,
      source: displayPath(file)
    }];
  }

  const chapters = [];
  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i];
    const end = starts[i + 1] ?? lines.length;
    const chunk = lines.slice(start, end).join("\n").trim();
    if (!chunk) continue;
    chapters.push({
      title: stripMarkdownHeading(lines[start]),
      text: chunk,
      source: `${displayPath(file)}#${stripMarkdownHeading(lines[start])}`
    });
  }

  return chapters;
}

function naturalFiles(dir) {
  const collator = new Intl.Collator("zh-Hans-CN", { numeric: true, sensitivity: "base" });
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && [".txt", ".md"].includes(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => collator.compare(path.basename(a), path.basename(b)));
}

function loadSourceChapters(sourcePath) {
  if (!exists(sourcePath)) throw new Error(`Input path does not exist: ${sourcePath}`);
  const stat = fs.statSync(sourcePath);
  const files = stat.isDirectory() ? naturalFiles(sourcePath) : [sourcePath];
  if (files.length === 0) throw new Error(`No .txt or .md files found in ${sourcePath}`);
  return files.flatMap((file) => splitFile(file));
}

function projectMetadata(importedChapters) {
  const metadataFile = path.join(projectRoot, "state", "metadata", "project.json");
  const importedTitle = options.title || titleFromFile(inputPath);
  const wordCountTarget = importedChapters.reduce((sum, chapter) => sum + countWords(chapter.text), 0);
  if (!exists(metadataFile)) {
    return {
      title: importedTitle,
      genre: [],
      style: "",
      author: options.author,
      word_count_target: wordCountTarget,
      template: "import",
      version: "2.0",
      last_updated_chapter: options.start + importedChapters.length - 1
    };
  }

  const current = readJson(metadataFile);
  return {
    ...current,
    title: options.title || current.title || importedTitle,
    author: options.author || current.author || "",
    word_count_target: current.word_count_target || wordCountTarget,
    last_updated_chapter: Math.max(current.last_updated_chapter ?? 0, options.start + importedChapters.length - 1)
  };
}

function buildBrief(chapterNumber, chapterRecordFile, manuscriptFile, contract) {
  return {
    chapter: chapterNumber,
    generated_at: options.generatedAt,
    purpose: `为导入章节 ${chapterNumber} 建立可审计上下文包，后续由 extract/verify 补全状态。`,
    source_files: [
      rel(chapterRecordFile),
      rel(manuscriptFile),
      "state/metadata/project.json"
    ],
    context_budget: {
      target_words: contract.word_count,
      max_context_items: 12
    },
    p0: [{
      kind: "project",
      id: null,
      name: options.title || titleFromFile(inputPath),
      summary: "导入正文生成的项目上下文，等待世界观、角色和情节线补全。",
      source: "state/metadata/project.json",
      priority: 10
    }],
    p1: [],
    p2: [{
      kind: "chapter",
      id: null,
      name: contract.title,
      summary: contract.summary,
      source: rel(chapterRecordFile),
      priority: 8
    }],
    p3: [],
    must_include: makeEmptyDelta(),
    writing_directives: [
      "这是导入章节，不要在未审校前改写原文事实。",
      "后续需要用 extract 补全角色、物品、场景、事件、情节线和关系状态。"
    ],
    exclusions: [
      "不要把导入占位字段当作 canon 设定。",
      "不要在未授权时补写重大新实体。"
    ],
    open_questions: [
      "本章涉及哪些角色、物品、场景、事件和情节线需要结构化？"
    ]
  };
}

function buildExtraction(chapterNumber, chapterRecordFile, manuscriptFile) {
  return {
    chapter: chapterNumber,
    generated_at: options.generatedAt,
    schema_version: "2.0",
    source_files: [
      rel(manuscriptFile),
      rel(chapterRecordFile)
    ],
    manuscript: {
      path: rel(manuscriptFile),
      word_count: countWords(readText(manuscriptFile)),
      paragraph_count: readText(manuscriptFile)
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean).length
    },
    mentioned_entities: [],
    state_delta_suggestion: makeEmptyDelta(),
    open_loop_candidates: [],
    decisions_required: [{
      code: "import_requires_extraction",
      message: "Imported chapter needs extract skill or human review to create concrete entity cards and state deltas.",
      source: rel(manuscriptFile)
    }],
    applied: false
  };
}

const sourceChapters = loadSourceChapters(inputPath);
if (sourceChapters.length === 0) {
  throw new Error(`No importable chapter content found in ${inputPath}`);
}

const stateRoot = path.join(projectRoot, "state");
const report = {
  generated_at: options.generatedAt,
  schema_version: "2.0",
  source: displayPath(inputPath),
  title: options.title || titleFromFile(inputPath),
  start_chapter: options.start,
  end_chapter: options.start + sourceChapters.length - 1,
  chapters: [],
  warnings: []
};

writeJson(path.join(stateRoot, "metadata", "project.json"), projectMetadata(sourceChapters), true);

sourceChapters.forEach((sourceChapter, index) => {
  const chapterNumber = options.start + index;
  const manuscriptFile = path.join(projectRoot, "chapters", `chapter_${chapterNumber}.txt`);
  const chapterRecordFile = path.join(stateRoot, "chapters", `chapter_${chapterNumber}.json`);
  const briefFile = path.join(stateRoot, "chapters", `chapter_${chapterNumber}`, "brief.json");
  const extractionFile = path.join(stateRoot, "chapters", `chapter_${chapterNumber}`, "extraction.json");
  const summary = snippet(sourceChapter.text);
  const wordCount = countWords(sourceChapter.text);
  const contract = {
    chapter: chapterNumber,
    title: sourceChapter.title || `第${chapterNumber}章`,
    status: options.status,
    chapter_goal: `导入并保全《${sourceChapter.title || `第${chapterNumber}章`}》原文，等待结构化提取。`,
    reader_promise: "保留原稿内容，后续补充本章爽点、情绪承诺和伏笔处理。",
    conflict_axis: "导入占位：待从原文提取本章主要冲突。",
    turning_point: "导入占位：待从原文提取本章不可逆转折。",
    summary,
    word_count: wordCount,
    style_tags: ["imported"],
    open_loops_introduced: [],
    open_loops_advanced: [],
    open_loops_resolved: [],
    state_delta: makeEmptyDelta(),
    created_at: options.generatedAt,
    updated_at: options.generatedAt,
    schema_version: "2.0"
  };

  writeText(manuscriptFile, sourceChapter.text);
  writeJson(chapterRecordFile, contract);
  writeJson(briefFile, buildBrief(chapterNumber, chapterRecordFile, manuscriptFile, contract));
  writeJson(extractionFile, buildExtraction(chapterNumber, chapterRecordFile, manuscriptFile));

  report.chapters.push({
    chapter: chapterNumber,
    title: contract.title,
    word_count: wordCount,
    manuscript: rel(manuscriptFile),
    contract: rel(chapterRecordFile),
    brief: rel(briefFile),
    extraction: rel(extractionFile),
    source: sourceChapter.source
  });

  if (wordCount < 500) {
    report.warnings.push({
      level: "info",
      message: `Imported chapter ${chapterNumber} is short; confirm chapter split if this was unexpected.`,
      source: rel(manuscriptFile)
    });
  }
});

const reportFile = path.join(stateRoot, "metadata", "import_report.json");
writeJson(reportFile, report);

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const buildIndexFile = path.join(toolDir, "build-index.mjs");
const indexResult = spawnSync(process.execPath, [buildIndexFile, projectRoot, "--generated-at", options.generatedAt], {
  encoding: "utf8"
});

if (indexResult.status !== 0) {
  if (indexResult.stderr || indexResult.stdout) process.stderr.write(indexResult.stderr || indexResult.stdout);
  throw new Error("Import succeeded but state index rebuild failed.");
}

if (indexResult.stdout) process.stdout.write(indexResult.stdout);
console.log(`Imported ${sourceChapters.length} chapters from ${displayPath(inputPath)}`);
console.log(`Wrote ${rel(reportFile)}`);

