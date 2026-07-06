import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const schemaDir = path.join(root, "schemas");

const schemaByStatePath = [
  [/^state\/metadata\/project\.json$/, "project.schema.json"],
  [/^state\/metadata\/loop_status\.json$/, "loop-status.schema.json"],
  [/^state\/metadata\/index\.json$/, "index.schema.json"],
  [/^state\/metadata\/action_queue\.json$/, "action-queue.schema.json"],
  [/^state\/metadata\/import_report\.json$/, "import-report.schema.json"],
  [/^state\/outline\/outline\.json$/, "outline.schema.json"],
  [/^state\/outline\/volume_[0-9]+\.json$/, "volume-outline.schema.json"],
  [/^state\/outline\/chapter_[0-9]+\.json$/, "chapter-outline.schema.json"],
  [/^state\/characters\/[^/]+\.json$/, "character.schema.json"],
  [/^state\/items\/[^/]+\.json$/, "item.schema.json"],
  [/^state\/scenes\/[^/]+\.json$/, "scene.schema.json"],
  [/^state\/organizations\/[^/]+\.json$/, "organization.schema.json"],
  [/^state\/concepts\/[^/]+\.json$/, "concept.schema.json"],
  [/^state\/timeline\/[^/]+\.json$/, "timeline-event.schema.json"],
  [/^state\/plot_threads\/[^/]+\.json$/, "plot-thread.schema.json"],
  [/^state\/relationships\/[^/]+\.json$/, "relationship.schema.json"],
  [/^state\/chapters\/chapter_[0-9]+\.json$/, "chapter.schema.json"],
  [/^state\/chapters\/chapter_[0-9]+\/brief\.json$/, "brief.schema.json"],
  [/^state\/chapters\/chapter_[0-9]+\/extraction\.json$/, "extraction.schema.json"],
  [/^state\/chapters\/chapter_[0-9]+\/review\.json$/, "review.schema.json"],
  [/^state\/chapters\/chapter_[0-9]+\/gate\.json$/, "chapter-gate.schema.json"],
  [/^state\/chapters\/chapter_[0-9]+\/revision_history\.json$/, "revision-history.schema.json"]
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(full);
    }
  }
  return files;
}

function relFrom(base, file) {
  return path.relative(base, file).replaceAll(path.sep, "/");
}

function getType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function allowedTypes(schema) {
  if (!schema.type) return null;
  return Array.isArray(schema.type) ? schema.type : [schema.type];
}

function resolveRef(rootSchema, ref) {
  if (!ref.startsWith("#/")) {
    throw new Error(`Unsupported schema ref ${ref}`);
  }
  return ref
    .slice(2)
    .split("/")
    .reduce((current, part) => current?.[part], rootSchema);
}

function validate(schema, value, at = "$", rootSchema = schema) {
  if (schema.$ref) {
    const resolved = resolveRef(rootSchema, schema.$ref);
    if (!resolved) return [`${at}: unresolved schema ref ${schema.$ref}`];
    return validate(resolved, value, at, rootSchema);
  }

  const errors = [];
  const types = allowedTypes(schema);
  if (types && !types.includes(getType(value))) {
    errors.push(`${at}: expected ${types.join("|")}, got ${getType(value)}`);
    return errors;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${at}: expected one of ${schema.enum.join(", ")}, got ${JSON.stringify(value)}`);
  }

  if (typeof value === "number" && typeof schema.minimum === "number" && value < schema.minimum) {
    errors.push(`${at}: expected >= ${schema.minimum}, got ${value}`);
  }

  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      errors.push(`${at}: expected length >= ${schema.minLength}`);
    }
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) {
      errors.push(`${at}: expected pattern ${schema.pattern}, got ${JSON.stringify(value)}`);
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => {
      errors.push(...validate(schema.items, item, `${at}[${index}]`, rootSchema));
    });
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const required = schema.required ?? [];
    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(`${at}: missing required property ${key}`);
      }
    }

    const properties = schema.properties ?? {};
    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(...validate(childSchema, value[key], `${at}.${key}`, rootSchema));
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          errors.push(`${at}: unexpected property ${key}`);
        }
      }
    }
  }

  return errors;
}

function schemaFor(relativePath) {
  const match = schemaByStatePath.find(([pattern]) => pattern.test(relativePath));
  return match ? match[1] : null;
}

function discoverStateRoots() {
  const roots = [];
  const projectState = path.join(root, "state");
  if (fs.existsSync(projectState)) roots.push(projectState);

  const examplesDir = path.join(root, "examples");
  if (fs.existsSync(examplesDir)) {
    for (const entry of fs.readdirSync(examplesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const exampleState = path.join(examplesDir, entry.name, "state");
      if (fs.existsSync(exampleState)) roots.push(exampleState);
    }
  }

  return roots;
}

function addEntity(index, kind, id, file, data, errors) {
  if (!id) return;
  if (index[kind].has(id)) {
    errors.push(`${relFrom(root, file)}: duplicate ${kind} id ${id}`);
  }
  index[kind].set(id, { file, data });
  index.all.set(id, { kind, file, data });
}

function hasId(index, id) {
  if (!id) return true;
  return index.all.has(id);
}

function expectId(index, id, kind, owner, errors) {
  if (!id) return;
  if (!index[kind].has(id)) {
    errors.push(`${owner}: missing ${kind} reference ${id}`);
  }
}

function expectAnyId(index, id, owner, errors) {
  if (!id) return;
  if (!hasId(index, id)) {
    errors.push(`${owner}: missing entity reference ${id}`);
  }
}

function expectArrayIds(index, ids, kind, owner, errors) {
  if (!Array.isArray(ids)) return;
  for (const id of ids) {
    expectId(index, id, kind, owner, errors);
  }
}

function buildStateIndex(stateRoot, schemaFailures) {
  const index = {
    characters: new Map(),
    items: new Map(),
    scenes: new Map(),
    organizations: new Map(),
    concepts: new Map(),
    events: new Map(),
    plotThreads: new Map(),
    relationships: new Map(),
    chapters: new Map(),
    briefs: new Map(),
    extractions: new Map(),
    reviews: new Map(),
    gates: new Map(),
    revisionHistories: new Map(),
    outlineChapters: new Map(),
    outlineVolumes: new Map(),
    metadata: new Map(),
    all: new Map()
  };

  for (const file of walk(stateRoot)) {
    const stateRelativePath = `state/${relFrom(stateRoot, file)}`;
    const data = readJson(file);
    const displayPath = relFrom(root, file);

    if (/^state\/metadata\/[^/]+\.json$/.test(stateRelativePath)) {
      index.metadata.set(path.basename(file), { file, data });
      continue;
    }

    const filenameId = path.basename(file, ".json");
    if (/^state\/characters\/[^/]+\.json$/.test(stateRelativePath)) {
      if (data.id !== filenameId) schemaFailures.push(`${displayPath}: id ${data.id} does not match filename ${filenameId}`);
      addEntity(index, "characters", data.id, file, data, schemaFailures);
    } else if (/^state\/items\/[^/]+\.json$/.test(stateRelativePath)) {
      if (data.id !== filenameId) schemaFailures.push(`${displayPath}: id ${data.id} does not match filename ${filenameId}`);
      addEntity(index, "items", data.id, file, data, schemaFailures);
    } else if (/^state\/scenes\/[^/]+\.json$/.test(stateRelativePath)) {
      if (data.id !== filenameId) schemaFailures.push(`${displayPath}: id ${data.id} does not match filename ${filenameId}`);
      addEntity(index, "scenes", data.id, file, data, schemaFailures);
    } else if (/^state\/organizations\/[^/]+\.json$/.test(stateRelativePath)) {
      if (data.id !== filenameId) schemaFailures.push(`${displayPath}: id ${data.id} does not match filename ${filenameId}`);
      addEntity(index, "organizations", data.id, file, data, schemaFailures);
    } else if (/^state\/concepts\/[^/]+\.json$/.test(stateRelativePath)) {
      if (data.id !== filenameId) schemaFailures.push(`${displayPath}: id ${data.id} does not match filename ${filenameId}`);
      addEntity(index, "concepts", data.id, file, data, schemaFailures);
    } else if (/^state\/timeline\/[^/]+\.json$/.test(stateRelativePath)) {
      if (data.id !== filenameId) schemaFailures.push(`${displayPath}: id ${data.id} does not match filename ${filenameId}`);
      addEntity(index, "events", data.id, file, data, schemaFailures);
    } else if (/^state\/plot_threads\/[^/]+\.json$/.test(stateRelativePath)) {
      if (data.id !== filenameId) schemaFailures.push(`${displayPath}: id ${data.id} does not match filename ${filenameId}`);
      addEntity(index, "plotThreads", data.id, file, data, schemaFailures);
    } else if (/^state\/relationships\/[^/]+\.json$/.test(stateRelativePath)) {
      if (data.id !== filenameId) schemaFailures.push(`${displayPath}: id ${data.id} does not match filename ${filenameId}`);
      addEntity(index, "relationships", data.id, file, data, schemaFailures);
    } else if (/^state\/chapters\/chapter_[0-9]+\.json$/.test(stateRelativePath)) {
      const expectedChapter = Number(filenameId.replace("chapter_", ""));
      if (data.chapter !== expectedChapter) schemaFailures.push(`${displayPath}: chapter ${data.chapter} does not match filename chapter_${expectedChapter}`);
      index.chapters.set(data.chapter, { file, data });
    } else if (/^state\/chapters\/chapter_[0-9]+\/brief\.json$/.test(stateRelativePath)) {
      const parent = path.basename(path.dirname(file));
      const expectedChapter = Number(parent.replace("chapter_", ""));
      if (data.chapter !== expectedChapter) schemaFailures.push(`${displayPath}: brief chapter ${data.chapter} does not match parent ${parent}`);
      index.briefs.set(data.chapter, { file, data });
    } else if (/^state\/chapters\/chapter_[0-9]+\/extraction\.json$/.test(stateRelativePath)) {
      const parent = path.basename(path.dirname(file));
      const expectedChapter = Number(parent.replace("chapter_", ""));
      if (data.chapter !== expectedChapter) schemaFailures.push(`${displayPath}: extraction chapter ${data.chapter} does not match parent ${parent}`);
      index.extractions.set(data.chapter, { file, data });
    } else if (/^state\/chapters\/chapter_[0-9]+\/review\.json$/.test(stateRelativePath)) {
      const parent = path.basename(path.dirname(file));
      const expectedChapter = Number(parent.replace("chapter_", ""));
      if (data.chapter !== expectedChapter) schemaFailures.push(`${displayPath}: review chapter ${data.chapter} does not match parent ${parent}`);
      index.reviews.set(data.chapter, { file, data });
    } else if (/^state\/chapters\/chapter_[0-9]+\/gate\.json$/.test(stateRelativePath)) {
      const parent = path.basename(path.dirname(file));
      const expectedChapter = Number(parent.replace("chapter_", ""));
      if (data.chapter !== expectedChapter) schemaFailures.push(`${displayPath}: gate chapter ${data.chapter} does not match parent ${parent}`);
      index.gates.set(data.chapter, { file, data });
    } else if (/^state\/chapters\/chapter_[0-9]+\/revision_history\.json$/.test(stateRelativePath)) {
      const parent = path.basename(path.dirname(file));
      const expectedChapter = Number(parent.replace("chapter_", ""));
      if (data.chapter !== expectedChapter) schemaFailures.push(`${displayPath}: revision history chapter ${data.chapter} does not match parent ${parent}`);
      index.revisionHistories.set(data.chapter, { file, data });
    } else if (/^state\/outline\/chapter_[0-9]+\.json$/.test(stateRelativePath)) {
      const expectedChapter = Number(filenameId.replace("chapter_", ""));
      if (data.chapter !== expectedChapter) schemaFailures.push(`${displayPath}: outline chapter ${data.chapter} does not match filename chapter_${expectedChapter}`);
      index.outlineChapters.set(data.chapter, { file, data });
    } else if (/^state\/outline\/volume_[0-9]+\.json$/.test(stateRelativePath)) {
      const expectedVolume = Number(filenameId.replace("volume_", ""));
      if (data.volume !== expectedVolume) schemaFailures.push(`${displayPath}: outline volume ${data.volume} does not match filename volume_${expectedVolume}`);
      index.outlineVolumes.set(data.volume, { file, data });
    }
  }

  return index;
}

function validateStateGraph(stateRoot) {
  const errors = [];
  const index = buildStateIndex(stateRoot, errors);
  const projectRoot = path.dirname(stateRoot);
  const stateLabel = relFrom(root, stateRoot);

  const project = index.metadata.get("project.json")?.data;
  if (project?.last_updated_chapter > 0 && !index.chapters.has(project.last_updated_chapter)) {
    errors.push(`${stateLabel}/metadata/project.json: last_updated_chapter ${project.last_updated_chapter} has no chapter record`);
  }

  const loopStatus = index.metadata.get("loop_status.json")?.data;
  for (const chapter of loopStatus?.completed_chapters ?? []) {
    if (!index.chapters.has(chapter)) {
      errors.push(`${stateLabel}/metadata/loop_status.json: completed chapter ${chapter} has no chapter record`);
    }
  }
  for (const chapter of loopStatus?.failed_chapters ?? []) {
    if (!index.chapters.has(chapter)) {
      errors.push(`${stateLabel}/metadata/loop_status.json: failed chapter ${chapter} has no chapter record`);
    }
  }

  for (const [id, { file, data }] of index.characters) {
    const owner = relFrom(root, file);
    expectArrayIds(index, data.current_state?.possessions, "items", `${owner}.current_state.possessions`, errors);
    for (const [key, rel] of Object.entries(data.relationship_map ?? {})) {
      expectAnyId(index, key, `${owner}.relationship_map`, errors);
      expectAnyId(index, rel?.target_id, `${owner}.relationship_map.${key}.target_id`, errors);
    }
  }

  for (const [id, { file, data }] of index.items) {
    const owner = relFrom(root, file);
    expectId(index, data.current_holder, "characters", `${owner}.current_holder`, errors);
    expectArrayIds(index, data.previous_holders, "characters", `${owner}.previous_holders`, errors);
  }

  for (const [id, { file, data }] of index.scenes) {
    const owner = relFrom(root, file);
    expectArrayIds(index, data.dynamic_state?.characters_present, "characters", `${owner}.dynamic_state.characters_present`, errors);
    expectArrayIds(index, data.dynamic_state?.key_objects, "items", `${owner}.dynamic_state.key_objects`, errors);
  }

  for (const [id, { file, data }] of index.organizations) {
    const owner = relFrom(root, file);
    expectArrayIds(index, data.territory, "scenes", `${owner}.territory`, errors);
    expectArrayIds(index, data.members, "characters", `${owner}.members`, errors);
    for (const relatedId of Object.keys(data.relationships ?? {})) {
      expectId(index, relatedId, "organizations", `${owner}.relationships`, errors);
    }
  }

  for (const [id, { file, data }] of index.events) {
    const owner = relFrom(root, file);
    expectArrayIds(index, data.participants, "characters", `${owner}.participants`, errors);
    expectArrayIds(index, data.related_items, "items", `${owner}.related_items`, errors);
    expectId(index, data.plot_thread_id, "plotThreads", `${owner}.plot_thread_id`, errors);
    if (data.chapter && !index.chapters.has(data.chapter)) {
      errors.push(`${owner}.chapter: chapter ${data.chapter} has no chapter record`);
    }
  }

  for (const [id, { file, data }] of index.plotThreads) {
    const owner = relFrom(root, file);
    expectArrayIds(index, data.related_events, "events", `${owner}.related_events`, errors);
  }

  for (const [id, { file, data }] of index.relationships) {
    const owner = relFrom(root, file);
    expectAnyId(index, data.source_id, `${owner}.source_id`, errors);
    expectAnyId(index, data.target_id, `${owner}.target_id`, errors);
  }

  for (const [chapter, { file, data }] of index.chapters) {
    const owner = relFrom(root, file);
    const manuscriptPath = path.join(projectRoot, "chapters", `chapter_${chapter}.txt`);
    if (data.status !== "planned" && !fs.existsSync(manuscriptPath)) {
      errors.push(`${owner}: status ${data.status} requires chapters/chapter_${chapter}.txt`);
    }

    if (data.status !== "planned" && !index.briefs.has(chapter)) {
      errors.push(`${owner}: status ${data.status} requires state/chapters/chapter_${chapter}/brief.json`);
    }

    if (data.status !== "planned" && !index.extractions.has(chapter)) {
      errors.push(`${owner}: status ${data.status} requires state/chapters/chapter_${chapter}/extraction.json`);
    }

    if (["verified", "revised", "locked"].includes(data.status)) {
      const review = index.reviews.get(chapter)?.data;
      if (!review) {
        errors.push(`${owner}: status ${data.status} requires state/chapters/chapter_${chapter}/review.json`);
      } else if ((review.summary?.critical_count ?? 0) > 0) {
        errors.push(`${owner}: status ${data.status} cannot have unresolved critical review findings`);
      }
    }

    const gate = index.gates.get(chapter)?.data;
    if (data.status === "locked" && !gate) {
      errors.push(`${owner}: status locked requires state/chapters/chapter_${chapter}/gate.json`);
    }
    if (gate && ["verified", "revised", "locked"].includes(data.status) && gate.result?.passed === false) {
      errors.push(`${owner}: status ${data.status} cannot have a blocked chapter gate`);
    }

    const delta = data.state_delta ?? {};
    expectArrayIds(index, delta.characters, "characters", `${owner}.state_delta.characters`, errors);
    expectArrayIds(index, delta.items, "items", `${owner}.state_delta.items`, errors);
    expectArrayIds(index, delta.scenes, "scenes", `${owner}.state_delta.scenes`, errors);
    expectArrayIds(index, delta.organizations, "organizations", `${owner}.state_delta.organizations`, errors);
    expectArrayIds(index, delta.concepts, "concepts", `${owner}.state_delta.concepts`, errors);
    expectArrayIds(index, delta.timeline_events, "events", `${owner}.state_delta.timeline_events`, errors);
    expectArrayIds(index, delta.plot_threads, "plotThreads", `${owner}.state_delta.plot_threads`, errors);
    expectArrayIds(index, delta.relationships, "relationships", `${owner}.state_delta.relationships`, errors);
  }

  for (const [chapter, { file, data }] of index.briefs) {
    const owner = relFrom(root, file);
    if (!index.chapters.has(chapter)) {
      errors.push(`${owner}: brief chapter ${chapter} has no chapter record`);
    }

    const requiredSourceFiles = data.source_files ?? [];
    for (const sourceFile of requiredSourceFiles) {
      const sourcePath = path.join(projectRoot, sourceFile);
      if (!fs.existsSync(sourcePath)) {
        errors.push(`${owner}.source_files: missing source file ${sourceFile}`);
      }
    }

    const must = data.must_include ?? {};
    expectArrayIds(index, must.characters, "characters", `${owner}.must_include.characters`, errors);
    expectArrayIds(index, must.items, "items", `${owner}.must_include.items`, errors);
    expectArrayIds(index, must.scenes, "scenes", `${owner}.must_include.scenes`, errors);
    expectArrayIds(index, must.organizations, "organizations", `${owner}.must_include.organizations`, errors);
    expectArrayIds(index, must.concepts, "concepts", `${owner}.must_include.concepts`, errors);
    expectArrayIds(index, must.timeline_events, "events", `${owner}.must_include.timeline_events`, errors);
    expectArrayIds(index, must.plot_threads, "plotThreads", `${owner}.must_include.plot_threads`, errors);
    expectArrayIds(index, must.relationships, "relationships", `${owner}.must_include.relationships`, errors);

    for (const tier of ["p0", "p1", "p2", "p3"]) {
      for (const [indexInTier, item] of (data[tier] ?? []).entries()) {
        if (item?.id) {
          expectAnyId(index, item.id, `${owner}.${tier}[${indexInTier}].id`, errors);
        }
      }
    }
  }

  for (const [chapter, { file, data }] of index.extractions) {
    const owner = relFrom(root, file);
    if (!index.chapters.has(chapter)) {
      errors.push(`${owner}: extraction chapter ${chapter} has no chapter record`);
    }
    for (const sourceFile of data.source_files ?? []) {
      const sourcePath = path.join(projectRoot, sourceFile);
      if (!fs.existsSync(sourcePath)) {
        errors.push(`${owner}.source_files: missing source file ${sourceFile}`);
      }
    }
    const suggestion = data.state_delta_suggestion ?? {};
    expectArrayIds(index, suggestion.characters, "characters", `${owner}.state_delta_suggestion.characters`, errors);
    expectArrayIds(index, suggestion.items, "items", `${owner}.state_delta_suggestion.items`, errors);
    expectArrayIds(index, suggestion.scenes, "scenes", `${owner}.state_delta_suggestion.scenes`, errors);
    expectArrayIds(index, suggestion.organizations, "organizations", `${owner}.state_delta_suggestion.organizations`, errors);
    expectArrayIds(index, suggestion.concepts, "concepts", `${owner}.state_delta_suggestion.concepts`, errors);
    expectArrayIds(index, suggestion.timeline_events, "events", `${owner}.state_delta_suggestion.timeline_events`, errors);
    expectArrayIds(index, suggestion.plot_threads, "plotThreads", `${owner}.state_delta_suggestion.plot_threads`, errors);
    expectArrayIds(index, suggestion.relationships, "relationships", `${owner}.state_delta_suggestion.relationships`, errors);
  }

  for (const [chapter, { file, data }] of index.gates) {
    const owner = relFrom(root, file);
    if (!index.chapters.has(chapter)) {
      errors.push(`${owner}: gate chapter ${chapter} has no chapter record`);
    }
    for (const sourceFile of data.source_files ?? []) {
      const sourcePath = path.join(projectRoot, sourceFile);
      if (!fs.existsSync(sourcePath)) {
        errors.push(`${owner}.source_files: missing source file ${sourceFile}`);
      }
    }
  }

  for (const [chapter, { file, data }] of index.revisionHistories) {
    const owner = relFrom(root, file);
    if (!index.chapters.has(chapter)) {
      errors.push(`${owner}: revision history chapter ${chapter} has no chapter record`);
    }
    for (const [revisionIndex, revision] of (data.revisions ?? []).entries()) {
      if (revision.source_review) {
        const sourcePath = path.join(projectRoot, revision.source_review);
        if (!fs.existsSync(sourcePath)) {
          errors.push(`${owner}.revisions[${revisionIndex}].source_review: missing source file ${revision.source_review}`);
        }
      }
      for (const changedFile of revision.files_changed ?? []) {
        const changedPath = path.join(projectRoot, changedFile);
        if (!fs.existsSync(changedPath)) {
          errors.push(`${owner}.revisions[${revisionIndex}].files_changed: missing changed file ${changedFile}`);
        }
      }
    }
  }

  for (const [chapter, { file, data }] of index.outlineChapters) {
    const owner = relFrom(root, file);
    const delta = data.state_delta_plan ?? {};
    expectArrayIds(index, delta.characters, "characters", `${owner}.state_delta_plan.characters`, errors);
    expectArrayIds(index, delta.items, "items", `${owner}.state_delta_plan.items`, errors);
    expectArrayIds(index, delta.scenes, "scenes", `${owner}.state_delta_plan.scenes`, errors);
    expectArrayIds(index, delta.organizations, "organizations", `${owner}.state_delta_plan.organizations`, errors);
    expectArrayIds(index, delta.concepts, "concepts", `${owner}.state_delta_plan.concepts`, errors);
    expectArrayIds(index, delta.timeline_events, "events", `${owner}.state_delta_plan.timeline_events`, errors);
    expectArrayIds(index, delta.plot_threads, "plotThreads", `${owner}.state_delta_plan.plot_threads`, errors);
    expectArrayIds(index, delta.relationships, "relationships", `${owner}.state_delta_plan.relationships`, errors);
  }

  return errors;
}

const stateRoots = discoverStateRoots();
const failures = [];
let validated = 0;
let graphChecked = 0;

for (const stateRoot of stateRoots) {
  for (const file of walk(stateRoot)) {
    const stateRelativePath = `state/${relFrom(stateRoot, file)}`;
    const displayPath = relFrom(root, file);
    const schemaName = schemaFor(stateRelativePath);
    if (!schemaName) continue;
    const schemaPath = path.join(schemaDir, schemaName);
    const schema = readJson(schemaPath);
    const data = readJson(file);
    const errors = validate(schema, data);
    if (errors.length) {
      failures.push(`${displayPath} (${schemaName})\n  ${errors.join("\n  ")}`);
    }
    validated += 1;
  }

  const graphErrors = validateStateGraph(stateRoot);
  if (graphErrors.length) {
    failures.push(`${relFrom(root, stateRoot)} graph integrity\n  ${graphErrors.join("\n  ")}`);
  }
  graphChecked += 1;
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Validated ${validated} state files and ${graphChecked} state graphs against StoryWeaver schemas.`);
