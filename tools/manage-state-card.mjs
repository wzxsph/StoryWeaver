import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function usage() {
  console.error(`Usage:
  node tools/manage-state-card.mjs <projectRoot> <kind> list [--json]
  node tools/manage-state-card.mjs <projectRoot> <kind> view (--id ID | --name NAME)
  node tools/manage-state-card.mjs <projectRoot> <kind> add --name NAME [--type TYPE] [--role ROLE] [--description TEXT] [--chapter N] [--id ID]
  node tools/manage-state-card.mjs <projectRoot> character update (--id ID | --name NAME) --field FIELD --value VALUE [--chapter N]`);
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 3) usage();

const projectRoot = path.resolve(args[0]);
const kindArg = args[1];
const action = args[2];
const options = {
  id: "",
  name: "",
  type: "",
  role: "",
  description: "",
  chapter: 1,
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
  } else if (arg === "--name") {
    options.name = next ?? "";
    i += 1;
  } else if (arg === "--type") {
    options.type = next ?? "";
    i += 1;
  } else if (arg === "--role") {
    options.role = next ?? "";
    i += 1;
  } else if (arg === "--description") {
    options.description = next ?? "";
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
  character: "character",
  characters: "character",
  item: "item",
  items: "item",
  scene: "scene",
  scenes: "scene",
  organization: "organization",
  organizations: "organization",
  org: "organization",
  concept: "concept",
  concepts: "concept"
};

const kind = kindAliases[kindArg];
if (!kind) usage();
if (!["list", "view", "add", "update"].includes(action)) usage();
if (!Number.isInteger(options.chapter) || options.chapter < 0) usage();

const configs = {
  character: { dir: "characters", prefix: "char" },
  item: { dir: "items", prefix: "item" },
  scene: { dir: "scenes", prefix: "scene" },
  organization: { dir: "organizations", prefix: "org" },
  concept: { dir: "concepts", prefix: "concept" }
};

const config = configs[kind];
const stateRoot = path.join(projectRoot, "state");
const entityDir = path.join(stateRoot, config.dir);

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

function loadCards() {
  return jsonFiles(entityDir).map((file) => ({ file, data: readJson(file) }));
}

function nextId(cards) {
  if (options.id) {
    const pattern = new RegExp(`^${config.prefix}_[0-9]{3,}$`);
    if (!pattern.test(options.id)) throw new Error(`Invalid ${kind} id: ${options.id}`);
    return options.id;
  }
  const max = cards
    .map(({ data }) => Number(String(data.id ?? "").replace(`${config.prefix}_`, "")))
    .filter(Number.isFinite)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${config.prefix}_${String(max + 1).padStart(3, "0")}`;
}

function findCard(cards) {
  if (options.id) return cards.find(({ data }) => data.id === options.id);
  if (options.name) return cards.find(({ data }) => data.name === options.name || data.title === options.name);
  usage();
}

function parseCsv(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function baseCard(id) {
  const now = new Date().toISOString();
  if (kind === "character") {
    return {
      id,
      name: options.name,
      role: options.role || "supporting",
      status: "alive",
      core_identity: {
        appearance: "",
        personality: "",
        background: options.description,
        goals: [],
        secrets: []
      },
      current_state: {
        location: {
          current: "",
          previous: "",
          changed_at_chapter: options.chapter
        },
        emotional_state: "",
        physical_state: "",
        possessions: [],
        abilities: [],
        cultivation_realm: ""
      },
      relationship_map: {},
      timeline: [],
      created_at: now,
      updated_at: now,
      last_updated_chapter: options.chapter,
      schema_version: "2.0"
    };
  }

  if (kind === "item") {
    return {
      id,
      name: options.name,
      type: options.type || "unknown",
      description: options.description,
      current_holder: null,
      previous_holders: [],
      abilities: [],
      limitations: [],
      current_state: "active",
      significant_events: []
    };
  }

  if (kind === "scene") {
    return {
      id,
      name: options.name,
      type: options.type || "unknown",
      description: options.description,
      location: "",
      function_in_story: "",
      dynamic_state: {
        time: "",
        atmosphere: "",
        characters_present: [],
        key_objects: [],
        last_changed_chapter: options.chapter
      },
      constraints: []
    };
  }

  if (kind === "organization") {
    return {
      id,
      name: options.name,
      type: options.type || "unknown",
      public_face: options.description,
      private_agenda: "",
      resources: [],
      fears: [],
      territory: [],
      members: [],
      relationships: {}
    };
  }

  if (kind === "concept") {
    return {
      id,
      name: options.name,
      type: options.type || "unknown",
      definition: options.description,
      rules: [],
      limitations: [],
      status: "draft",
      introduced_chapter: options.chapter,
      last_updated_chapter: options.chapter
    };
  }

  throw new Error(`Unsupported kind ${kind}`);
}

function printCards(cards) {
  const rows = cards.map(({ data }) => ({
    id: data.id,
    kind,
    name: data.name ?? data.title ?? "",
    type: data.type ?? data.role ?? "",
    status: data.status ?? data.current_state ?? "",
    source: rel(path.join(entityDir, `${data.id}.json`))
  }));
  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (rows.length === 0) {
    console.log(`No ${kind} cards found.`);
    return;
  }
  for (const row of rows) {
    console.log(`${row.id}\t${row.name}\t${row.type}\t${row.status}\t${row.source}`);
  }
}

function applyCharacterUpdate(card) {
  const data = card.data;
  const now = new Date().toISOString();
  const field = options.field;
  const value = options.value;
  if (!field) usage();

  if (field === "status") {
    data.status = value;
  } else if (field === "current_location") {
    data.current_state = data.current_state ?? {};
    const previous = data.current_state.location?.current ?? "";
    data.current_state.location = {
      current: value,
      previous,
      changed_at_chapter: options.chapter
    };
  } else if (field === "emotional_state") {
    data.current_state = data.current_state ?? {};
    data.current_state.emotional_state = value;
  } else if (field === "physical_state") {
    data.current_state = data.current_state ?? {};
    data.current_state.physical_state = value;
  } else if (field === "cultivation_realm") {
    data.current_state = data.current_state ?? {};
    data.current_state.cultivation_realm = value;
  } else if (field === "abilities") {
    data.current_state = data.current_state ?? {};
    data.current_state.abilities = parseCsv(value);
  } else if (field === "goals") {
    data.core_identity = data.core_identity ?? {};
    data.core_identity.goals = parseCsv(value);
  } else if (field === "secrets") {
    data.core_identity = data.core_identity ?? {};
    data.core_identity.secrets = parseCsv(value);
  } else {
    throw new Error(`Unsupported character update field: ${field}`);
  }

  data.updated_at = now;
  data.last_updated_chapter = Math.max(data.last_updated_chapter ?? 0, options.chapter);
  writeJson(card.file, data);
  console.log(`Wrote ${rel(card.file)}`);
}

function rebuildIndex() {
  const toolDir = path.dirname(fileURLToPath(import.meta.url));
  const buildIndexFile = path.join(toolDir, "build-index.mjs");
  if (!exists(buildIndexFile)) return;
  const result = spawnSync(process.execPath, [buildIndexFile, projectRoot], { encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error("State card operation succeeded, but index rebuild failed.");
  }
}

fs.mkdirSync(entityDir, { recursive: true });
const cards = loadCards();

if (action === "list") {
  printCards(cards);
} else if (action === "view") {
  const card = findCard(cards);
  if (!card) throw new Error(`No ${kind} card matched the query.`);
  console.log(JSON.stringify(card.data, null, 2));
} else if (action === "add") {
  if (!options.name.trim()) usage();
  if (cards.some(({ data }) => data.name === options.name || data.title === options.name)) {
    throw new Error(`${kind} card already exists with name: ${options.name}`);
  }
  const id = nextId(cards);
  const file = path.join(entityDir, `${id}.json`);
  if (exists(file)) throw new Error(`Refusing to overwrite existing card: ${rel(file)}`);
  const card = baseCard(id);
  writeJson(file, card);
  console.log(`Wrote ${rel(file)}`);
  rebuildIndex();
} else if (action === "update") {
  if (kind !== "character") {
    throw new Error("Only character update is currently supported by this deterministic updater.");
  }
  const card = findCard(cards);
  if (!card) throw new Error("No character card matched the query.");
  applyCharacterUpdate(card);
  rebuildIndex();
}

