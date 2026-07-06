import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function usage() {
  console.error("Usage: node tools/init-project.mjs <projectRoot> [--title TITLE] [--genre a,b] [--style STYLE] [--author AUTHOR] [--target-words N] [--template default|snowflake] [--generated-at ISO] [--overwrite]");
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 1) usage();

const projectRoot = path.resolve(args[0]);
const options = {
  title: "",
  genre: [],
  style: "",
  author: "",
  targetWords: 0,
  template: "default",
  generatedAt: new Date().toISOString(),
  overwrite: false
};

for (let i = 1; i < args.length; i += 1) {
  const arg = args[i];
  const next = args[i + 1];
  if (arg === "--title") {
    options.title = next;
    i += 1;
  } else if (arg === "--genre") {
    options.genre = String(next ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    i += 1;
  } else if (arg === "--style") {
    options.style = next;
    i += 1;
  } else if (arg === "--author") {
    options.author = next;
    i += 1;
  } else if (arg === "--target-words") {
    options.targetWords = Number(next);
    i += 1;
  } else if (arg === "--template") {
    options.template = next;
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

if (!["default", "snowflake", "import"].includes(options.template)) usage();
if (!Number.isFinite(options.targetWords) || options.targetWords < 0) usage();

const stateRoot = path.join(projectRoot, "state");
const directories = [
  "metadata",
  "outline",
  "characters",
  "items",
  "scenes",
  "organizations",
  "concepts",
  "timeline",
  "plot_threads",
  "relationships",
  "chapters"
];

function exists(file) {
  return fs.existsSync(file);
}

function rel(file) {
  return path.relative(projectRoot, file).replaceAll(path.sep, "/");
}

function writeJson(file, data) {
  if (!options.overwrite && exists(file)) {
    throw new Error(`Refusing to overwrite ${rel(file)}. Pass --overwrite to replace initialized metadata.`);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function touchGitkeep(dir) {
  const file = path.join(dir, ".gitkeep");
  if (!exists(file)) {
    fs.writeFileSync(file, "", "utf8");
  }
}

fs.mkdirSync(projectRoot, { recursive: true });
for (const dir of directories) {
  const fullDir = path.join(stateRoot, dir);
  fs.mkdirSync(fullDir, { recursive: true });
  if (dir !== "metadata") touchGitkeep(fullDir);
}
fs.mkdirSync(path.join(projectRoot, "chapters"), { recursive: true });
touchGitkeep(path.join(projectRoot, "chapters"));

const project = {
  title: options.title,
  genre: options.genre,
  style: options.style,
  author: options.author,
  word_count_target: options.targetWords,
  template: options.template,
  version: "2.0",
  last_updated_chapter: 0,
  created_at: options.generatedAt,
  updated_at: options.generatedAt
};

const loopStatus = {
  running: false,
  started_at: null,
  completed_at: null,
  current_chapter: 0,
  target_chapter: 0,
  mode: "safe",
  scope: "all",
  completed_chapters: [],
  failed_chapters: [],
  stats: {
    total_words_written: 0,
    chapters_completed: 0,
    revisions_made: 0
  },
  recent_activity: []
};

writeJson(path.join(stateRoot, "metadata", "project.json"), project);
writeJson(path.join(stateRoot, "metadata", "loop_status.json"), loopStatus);

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const commands = [
  ["build-index.mjs", [projectRoot, "--generated-at", options.generatedAt]],
  ["build-action-queue.mjs", [projectRoot, "--generated-at", options.generatedAt]]
];

for (const [tool, toolArgs] of commands) {
  const result = spawnSync(process.execPath, [path.join(toolDir, tool), ...toolArgs], {
    encoding: "utf8"
  });
  if (result.status !== 0) {
    if (result.stderr || result.stdout) process.stderr.write(result.stderr || result.stdout);
    throw new Error(`Initialization wrote metadata but ${tool} failed.`);
  }
  if (result.stdout) process.stdout.write(result.stdout);
}

console.log(`Initialized StoryWeaver project at ${projectRoot}`);

