param(
  [switch]$Strict
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "== Claude Code plugin validation =="
$validateArgs = @("plugin", "validate", ".")
if ($Strict) {
  $validateArgs += "--strict"
}
& claude @validateArgs

Write-Host "== JSON validation =="
$jsonFiles = Get-ChildItem -Recurse -File -Include *.json |
  Where-Object { $_.FullName -notmatch "\\.git\\" -and $_.FullName -notmatch "\\snapshots\\" }

foreach ($file in $jsonFiles) {
  Get-Content -Raw -Encoding UTF8 -LiteralPath $file.FullName | ConvertFrom-Json | Out-Null
}
Write-Host "Validated $($jsonFiles.Count) JSON files."

Write-Host "== State schema validation =="
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw "Node.js is required for state schema validation."
}
& node (Join-Path $root "tools\validate-state-schemas.mjs") $root

Write-Host "== Init project smoke test =="
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("storyweaver-init-smoke-" + [Guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
  Copy-Item -Recurse -LiteralPath (Join-Path $root "schemas") -Destination (Join-Path $tempRoot "schemas")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "tools") -Destination (Join-Path $tempRoot "tools")

  & node (Join-Path $tempRoot "tools\init-project.mjs") $tempRoot --title "Init Smoke" --genre "xuanhuan,upgrade" --style "fast" --author "Smoke Test" --target-words 300000 --template snowflake --generated-at "2026-07-06T00:00:00Z"
  & node (Join-Path $tempRoot "tools\validate-state-schemas.mjs") $tempRoot
} finally {
  $resolvedTemp = Resolve-Path -LiteralPath $tempRoot -ErrorAction SilentlyContinue
  $tempBase = [System.IO.Path]::GetTempPath()
  if ($resolvedTemp -and $resolvedTemp.Path.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -Recurse -Force -LiteralPath $resolvedTemp.Path
  }
}

Write-Host "== Snapshot restore smoke test =="
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("storyweaver-snapshot-smoke-" + [Guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
  Copy-Item -Recurse -LiteralPath (Join-Path $root "schemas") -Destination (Join-Path $tempRoot "schemas")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "tools") -Destination (Join-Path $tempRoot "tools")

  & node (Join-Path $tempRoot "tools\init-project.mjs") $tempRoot --title "Snapshot Smoke" --template default --generated-at "2026-07-06T00:00:00Z"
  & node (Join-Path $tempRoot "tools\create-snapshot.mjs") $tempRoot --reason "smoke test" --generated-at "2026-07-06T00:00:00Z"

  $manifestFile = Get-ChildItem -Recurse -File -LiteralPath (Join-Path $tempRoot "snapshots") -Filter manifest.json | Select-Object -First 1
  if (-not $manifestFile) {
    throw "Snapshot smoke test did not create a manifest."
  }

  $manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath $manifestFile.FullName | ConvertFrom-Json
  if ($manifest.counts.files -lt 2) {
    throw "Snapshot smoke test captured too few files."
  }

  $projectFile = Join-Path $tempRoot "state\metadata\project.json"
  $project = Get-Content -Raw -Encoding UTF8 -LiteralPath $projectFile | ConvertFrom-Json
  $project.title = "Mutated Snapshot Smoke"
  $project | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -LiteralPath $projectFile

  & node (Join-Path $tempRoot "tools\restore-snapshot.mjs") $tempRoot --snapshot $manifest.snapshot_id --force
  $restoredProject = Get-Content -Raw -Encoding UTF8 -LiteralPath $projectFile | ConvertFrom-Json
  if ($restoredProject.title -ne "Snapshot Smoke") {
    throw "Snapshot restore smoke test did not restore project metadata."
  }

  & node (Join-Path $tempRoot "tools\validate-state-schemas.mjs") $tempRoot
} finally {
  $resolvedTemp = Resolve-Path -LiteralPath $tempRoot -ErrorAction SilentlyContinue
  $tempBase = [System.IO.Path]::GetTempPath()
  if ($resolvedTemp -and $resolvedTemp.Path.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -Recurse -Force -LiteralPath $resolvedTemp.Path
  }
}

Write-Host "== State card manager smoke test =="
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("storyweaver-card-smoke-" + [Guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
  Copy-Item -Recurse -LiteralPath (Join-Path $root "schemas") -Destination (Join-Path $tempRoot "schemas")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "tools") -Destination (Join-Path $tempRoot "tools")

  & node (Join-Path $tempRoot "tools\init-project.mjs") $tempRoot --title "Card Smoke" --template default --generated-at "2026-07-06T00:00:00Z"
  & node (Join-Path $tempRoot "tools\manage-state-card.mjs") $tempRoot character add --name "Smoke Hero" --role protagonist --description "Card manager smoke-test protagonist." --chapter 1
  & node (Join-Path $tempRoot "tools\manage-state-card.mjs") $tempRoot character update --name "Smoke Hero" --field emotional_state --value "focused" --chapter 1
  & node (Join-Path $tempRoot "tools\manage-state-card.mjs") $tempRoot item add --name "Smoke Sword" --type "weapon" --description "A test blade."

  $character = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $tempRoot "state\characters\char_001.json") | ConvertFrom-Json
  if ($character.current_state.emotional_state -ne "focused") {
    throw "State card manager smoke test did not update the character emotional_state."
  }

  & node (Join-Path $tempRoot "tools\validate-state-schemas.mjs") $tempRoot
} finally {
  $resolvedTemp = Resolve-Path -LiteralPath $tempRoot -ErrorAction SilentlyContinue
  $tempBase = [System.IO.Path]::GetTempPath()
  if ($resolvedTemp -and $resolvedTemp.Path.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -Recurse -Force -LiteralPath $resolvedTemp.Path
  }
}


Write-Host "== Story graph manager smoke test =="
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("storyweaver-graph-smoke-" + [Guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
  Copy-Item -Recurse -LiteralPath (Join-Path $root "schemas") -Destination (Join-Path $tempRoot "schemas")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "tools") -Destination (Join-Path $tempRoot "tools")

  & node (Join-Path $tempRoot "tools\init-project.mjs") $tempRoot --title "Graph Smoke" --template default --generated-at "2026-07-06T00:00:00Z"
  & node (Join-Path $tempRoot "tools\plan-outline.mjs") $tempRoot --type chapter --scope 1 --title "Graph Event" --content "A test chapter records a plot thread, timeline event, and relationship." --generated-at "2026-07-06T00:00:00Z"
  & node (Join-Path $tempRoot "tools\manage-state-card.mjs") $tempRoot character add --name "Smoke Hero" --role protagonist --description "Graph manager smoke-test protagonist." --chapter 1
  & node (Join-Path $tempRoot "tools\manage-state-card.mjs") $tempRoot item add --name "Smoke Sword" --type "weapon" --description "A test blade."
  & node (Join-Path $tempRoot "tools\manage-story-graph.mjs") $tempRoot plot add --name "Smoke Mystery" --description "A test mystery thread." --status active --progress 10 --chapter 1
  & node (Join-Path $tempRoot "tools\manage-story-graph.mjs") $tempRoot timeline add --title "Smoke Event" --chapter 1 --description "Smoke Hero hears Smoke Sword answer." --participants "Smoke Hero" --items "Smoke Sword" --plot "Smoke Mystery" --consequences "The mystery gains evidence."
  & node (Join-Path $tempRoot "tools\manage-story-graph.mjs") $tempRoot relationship add --source "Smoke Hero" --target "Smoke Sword" --type "bonded" --strength 5 --evidence "Smoke Event" --chapter 1

  $chapter = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $tempRoot "state\chapters\chapter_1.json") | ConvertFrom-Json
  if (-not ($chapter.state_delta.timeline_events -contains "event_001") -or -not ($chapter.state_delta.plot_threads -contains "plot_001") -or -not ($chapter.state_delta.relationships -contains "rel_001")) {
    throw "Story graph manager smoke test did not update chapter state_delta."
  }

  $plot = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $tempRoot "state\plot_threads\plot_001.json") | ConvertFrom-Json
  if (-not ($plot.related_events -contains "event_001")) {
    throw "Story graph manager smoke test did not link the timeline event to the plot thread."
  }

  $character = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $tempRoot "state\characters\char_001.json") | ConvertFrom-Json
  if (-not $character.relationship_map.item_001 -or $character.relationship_map.item_001.relationship_type -ne "bonded") {
    throw "Story graph manager smoke test did not update the character relationship_map."
  }

  & node (Join-Path $tempRoot "tools\validate-state-schemas.mjs") $tempRoot
} finally {
  $resolvedTemp = Resolve-Path -LiteralPath $tempRoot -ErrorAction SilentlyContinue
  $tempBase = [System.IO.Path]::GetTempPath()
  if ($resolvedTemp -and $resolvedTemp.Path.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -Recurse -Force -LiteralPath $resolvedTemp.Path
  }
}

Write-Host "== Outline planner smoke test =="
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("storyweaver-plan-smoke-" + [Guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
  Copy-Item -Recurse -LiteralPath (Join-Path $root "schemas") -Destination (Join-Path $tempRoot "schemas")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "tools") -Destination (Join-Path $tempRoot "tools")

  & node (Join-Path $tempRoot "tools\init-project.mjs") $tempRoot --title "Plan Smoke" --template default --generated-at "2026-07-06T00:00:00Z"
  & node (Join-Path $tempRoot "tools\plan-outline.mjs") $tempRoot --type outline --content "A discarded sword wakes and exposes an old sect case." --generated-at "2026-07-06T00:00:00Z"
  & node (Join-Path $tempRoot "tools\plan-outline.mjs") $tempRoot --type volume --volume 1 --scope 1-3 --content "The first volume tests the protagonist and the sword." --generated-at "2026-07-06T00:00:00Z"
  & node (Join-Path $tempRoot "tools\plan-outline.mjs") $tempRoot --type chapter --scope 1 --title "Old Sword Speaks" --content "The protagonist hears the old sword call her hidden name." --generated-at "2026-07-06T00:00:00Z"
  & node (Join-Path $tempRoot "tools\validate-state-schemas.mjs") $tempRoot
} finally {
  $resolvedTemp = Resolve-Path -LiteralPath $tempRoot -ErrorAction SilentlyContinue
  $tempBase = [System.IO.Path]::GetTempPath()
  if ($resolvedTemp -and $resolvedTemp.Path.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -Recurse -Force -LiteralPath $resolvedTemp.Path
  }
}

Write-Host "== Brief builder smoke test =="
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("storyweaver-brief-smoke-" + [Guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path (Join-Path $tempRoot "examples") -Force | Out-Null
  Copy-Item -Recurse -LiteralPath (Join-Path $root "state") -Destination (Join-Path $tempRoot "state")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "examples\minimal-project") -Destination (Join-Path $tempRoot "examples\minimal-project")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "schemas") -Destination (Join-Path $tempRoot "schemas")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "tools") -Destination (Join-Path $tempRoot "tools")

  $briefPath = Join-Path $tempRoot "examples\minimal-project\state\chapters\chapter_1\brief.json"
  if (Test-Path $briefPath) {
    Remove-Item -LiteralPath $briefPath
  }

  & node (Join-Path $tempRoot "tools\build-brief.mjs") (Join-Path $tempRoot "examples\minimal-project") --chapter 1 --words 3000 --max-context-items 16 --generated-at "2026-07-06T00:00:00Z"
  & node (Join-Path $tempRoot "tools\validate-state-schemas.mjs") $tempRoot
} finally {
  $resolvedTemp = Resolve-Path -LiteralPath $tempRoot -ErrorAction SilentlyContinue
  $tempBase = [System.IO.Path]::GetTempPath()
  if ($resolvedTemp -and $resolvedTemp.Path.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -Recurse -Force -LiteralPath $resolvedTemp.Path
  }
}

Write-Host "== State index builder smoke test =="
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("storyweaver-index-smoke-" + [Guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path (Join-Path $tempRoot "examples") -Force | Out-Null
  Copy-Item -Recurse -LiteralPath (Join-Path $root "state") -Destination (Join-Path $tempRoot "state")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "examples\minimal-project") -Destination (Join-Path $tempRoot "examples\minimal-project")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "schemas") -Destination (Join-Path $tempRoot "schemas")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "tools") -Destination (Join-Path $tempRoot "tools")

  $indexPath = Join-Path $tempRoot "examples\minimal-project\state\metadata\index.json"
  if (Test-Path $indexPath) {
    Remove-Item -LiteralPath $indexPath
  }

  & node (Join-Path $tempRoot "tools\build-index.mjs") (Join-Path $tempRoot "examples\minimal-project") --generated-at "2026-07-06T00:00:00Z"
  & node (Join-Path $tempRoot "tools\validate-state-schemas.mjs") $tempRoot
} finally {
  $resolvedTemp = Resolve-Path -LiteralPath $tempRoot -ErrorAction SilentlyContinue
  $tempBase = [System.IO.Path]::GetTempPath()
  if ($resolvedTemp -and $resolvedTemp.Path.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -Recurse -Force -LiteralPath $resolvedTemp.Path
  }
}

Write-Host "== Chapter extraction smoke test =="
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("storyweaver-extraction-smoke-" + [Guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path (Join-Path $tempRoot "examples") -Force | Out-Null
  Copy-Item -Recurse -LiteralPath (Join-Path $root "state") -Destination (Join-Path $tempRoot "state")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "examples\minimal-project") -Destination (Join-Path $tempRoot "examples\minimal-project")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "schemas") -Destination (Join-Path $tempRoot "schemas")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "tools") -Destination (Join-Path $tempRoot "tools")

  $extractionPath = Join-Path $tempRoot "examples\minimal-project\state\chapters\chapter_1\extraction.json"
  if (Test-Path $extractionPath) {
    Remove-Item -LiteralPath $extractionPath
  }

  & node (Join-Path $tempRoot "tools\extract-chapter-facts.mjs") (Join-Path $tempRoot "examples\minimal-project") --chapter 1 --apply --generated-at "2026-07-06T00:00:00Z"
  $extraction = Get-Content -Raw -Encoding UTF8 -LiteralPath $extractionPath | ConvertFrom-Json
  if (-not $extraction.applied -or $extraction.mentioned_entities.Count -lt 1) {
    throw "Chapter extraction smoke test did not capture expected entity evidence."
  }

  & node (Join-Path $tempRoot "tools\validate-state-schemas.mjs") $tempRoot
} finally {
  $resolvedTemp = Resolve-Path -LiteralPath $tempRoot -ErrorAction SilentlyContinue
  $tempBase = [System.IO.Path]::GetTempPath()
  if ($resolvedTemp -and $resolvedTemp.Path.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -Recurse -Force -LiteralPath $resolvedTemp.Path
  }
}

Write-Host "== Chapter gate smoke test =="
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("storyweaver-gate-smoke-" + [Guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path (Join-Path $tempRoot "examples") -Force | Out-Null
  Copy-Item -Recurse -LiteralPath (Join-Path $root "state") -Destination (Join-Path $tempRoot "state")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "examples\minimal-project") -Destination (Join-Path $tempRoot "examples\minimal-project")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "schemas") -Destination (Join-Path $tempRoot "schemas")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "tools") -Destination (Join-Path $tempRoot "tools")

  $gatePath = Join-Path $tempRoot "examples\minimal-project\state\chapters\chapter_1\gate.json"
  if (Test-Path $gatePath) {
    Remove-Item -LiteralPath $gatePath
  }

  & node (Join-Path $tempRoot "tools\check-chapter-gate.mjs") (Join-Path $tempRoot "examples\minimal-project") --chapter 1 --min-words 1 --generated-at "2026-07-06T00:00:00Z"
  $gate = Get-Content -Raw -Encoding UTF8 -LiteralPath $gatePath | ConvertFrom-Json
  if (-not $gate.result.passed -or $gate.result.status -ne "passed") {
    throw "Chapter gate smoke test did not pass the minimal project chapter."
  }

  & node (Join-Path $tempRoot "tools\check-chapter-gate.mjs") (Join-Path $tempRoot "examples\minimal-project") --chapter 1 --min-words 1 --promote verified --generated-at "2026-07-06T00:00:00Z"
  $promotedGate = Get-Content -Raw -Encoding UTF8 -LiteralPath $gatePath | ConvertFrom-Json
  if ($promotedGate.promoted_to -ne "verified") {
    throw "Chapter gate smoke test did not record the promotion."
  }
  $project = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $tempRoot "examples\minimal-project\state\metadata\project.json") | ConvertFrom-Json
  if ($project.last_updated_chapter -lt 1) {
    throw "Chapter gate smoke test did not advance project metadata."
  }

  & node (Join-Path $tempRoot "tools\validate-state-schemas.mjs") $tempRoot
} finally {
  $resolvedTemp = Resolve-Path -LiteralPath $tempRoot -ErrorAction SilentlyContinue
  $tempBase = [System.IO.Path]::GetTempPath()
  if ($resolvedTemp -and $resolvedTemp.Path.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -Recurse -Force -LiteralPath $resolvedTemp.Path
  }
}

Write-Host "== Manuscript import smoke test =="
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("storyweaver-import-smoke-" + [Guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
  Copy-Item -Recurse -LiteralPath (Join-Path $root "schemas") -Destination (Join-Path $tempRoot "schemas")
  Copy-Item -Recurse -LiteralPath (Join-Path $root "tools") -Destination (Join-Path $tempRoot "tools")

  $draftPath = Join-Path $tempRoot "draft.txt"
  $draftContent = @(
    "Chapter 1 Old Sword Speaks",
    "",
    "Lin Xiaoyu hears the old sword call her childhood name in the ancestral hall.",
    "",
    "Chapter 2 The Retest Bell",
    "",
    "The steward elder rings the bronze bell, and every outer disciple must attend the spirit-root retest."
  ) -join [Environment]::NewLine
  Set-Content -Encoding UTF8 -LiteralPath $draftPath -Value $draftContent

  & node (Join-Path $tempRoot "tools\import-manuscript.mjs") $tempRoot --input $draftPath --title "Import Smoke" --author "Smoke Test" --generated-at "2026-07-06T00:00:00Z"

  $reviewDir = Join-Path $tempRoot "state\chapters\chapter_1"
  New-Item -ItemType Directory -Path $reviewDir -Force | Out-Null
  $review = @{
    chapter = 1
    timestamp = "2026-07-06T00:00:00Z"
    scope = "all"
    passed = $false
    violations = @(
      @{
        severity = "warning"
        dimension = "emotional_continuity"
        description = "Smoke test warning"
        location = "chapter_1"
        suggestion = "Revise the emotional transition."
      }
    )
    passed_dimensions = @()
    summary = @{
      critical_count = 0
      warning_count = 1
      info_count = 0
      passed = $false
    }
  }
  $review | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $reviewDir "review.json")

  & node (Join-Path $tempRoot "tools\build-action-queue.mjs") $tempRoot --generated-at "2026-07-06T00:00:00Z"
  $queue = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $tempRoot "state\metadata\action_queue.json") | ConvertFrom-Json
  if ($queue.summary.warning -ne 1 -or $queue.tasks.Count -ne 1) {
    throw "Action queue smoke test did not capture the injected warning."
  }

  & node (Join-Path $tempRoot "tools\record-revision.mjs") $tempRoot --chapter 1 --summary "Smoke test revision record." --files "chapters/chapter_1.txt" --generated-at "2026-07-06T00:00:00Z"
  $history = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $tempRoot "state\chapters\chapter_1\revision_history.json") | ConvertFrom-Json
  if ($history.revisions.Count -ne 1 -or $history.revisions[0].fixes.Count -ne 1) {
    throw "Revision history smoke test did not capture the queued warning."
  }

  & node (Join-Path $tempRoot "tools\validate-state-schemas.mjs") $tempRoot
} finally {
  $resolvedTemp = Resolve-Path -LiteralPath $tempRoot -ErrorAction SilentlyContinue
  $tempBase = [System.IO.Path]::GetTempPath()
  if ($resolvedTemp -and $resolvedTemp.Path.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -Recurse -Force -LiteralPath $resolvedTemp.Path
  }
}

Write-Host "== Active component legacy-state scan =="
$activeRoots = @("agents", "commands", "skills", "rules", "workflows")
$legacyHits = @()
foreach ($dir in $activeRoots) {
  if (Test-Path $dir) {
    $files = Get-ChildItem -Recurse -File -LiteralPath $dir -Include *.md,*.txt,*.json
    if ($files.Count -gt 0) {
      $legacyHits += Select-String -Path $files.FullName -Pattern "\.storyweaver/state_document|\.novelai_writer/state_document|state_document\.json"
    }
  }
}

if ($legacyHits.Count -gt 0) {
  $legacyHits | ForEach-Object { Write-Host "$($_.Path):$($_.LineNumber): $($_.Line)" }
  throw "Legacy monolithic state references found in active components."
}

Write-Host "== Skill structure =="
$skillDirs = Get-ChildItem -Directory skills
foreach ($dir in $skillDirs) {
  $skillFile = Join-Path $dir.FullName "SKILL.md"
  if (-not (Test-Path $skillFile)) {
    throw "Missing SKILL.md in $($dir.FullName)"
  }
  $head = Get-Content -Encoding UTF8 -TotalCount 8 -LiteralPath $skillFile
  if ($head[0] -ne "---" -or -not ($head -match "^description:")) {
    throw "Missing YAML description in $skillFile"
  }
}
Write-Host "Validated $($skillDirs.Count) skill directories."

Write-Host "StoryWeaver validation complete."
