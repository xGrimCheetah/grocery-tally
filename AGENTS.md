# Grocery Tally PWA - Codex Instructions

## Project style
This is a small GitHub Pages PWA for a personal grocery list app.

Make small, focused changes only. Do not redesign unrelated parts of the app.

## Workflow rules
- Prefer narrow branches and reviewable pull requests.
- Do not make broad refactors unless explicitly requested.
- Do not introduce build tools, package managers, frameworks, or dependencies unless explicitly requested.
- Keep changes compatible with GitHub Pages.

## Versioning rules
- App versions use semantic versions like `v1.37.1`.
- For app feature updates, use branches named like:
  - `feature-v1.38.0-example-name`
- For patches, use branches named like:
  - `fix-v1.37.2-example-name`
- Keep visible app version, `APP_VERSION`, `version.json`, README current build, and any cache/version references consistent when an app release changes behavior.
- Do not bump the app version for repo-only process files unless explicitly requested.

## Changelog rules
When updating `CHANGELOG.md`:
- Add only the newest entry at the top.
- Do not edit, rewrite, reorder, remove, or clean up older changelog entries.
- Preserve all older changelog text exactly.

## PWA rules
- Be careful with `service-worker.js`.
- Do not remove `.nojekyll`.
- Do not break GitHub Pages compatibility.
- Preserve offline/PWA behavior.
- Avoid changing cache behavior unless the task requires it.

## UI rules
- Keep Build List fast, clean, and uncluttered.
- There should only be one Build List search field.
- Do not show individual item prices in Build List or Shopping Mode unless explicitly requested.
- Keep the estimated total compact, right-aligned, and top-aligned.
- Keep Shopping Mode separate from Build List behavior.
- Do not change tab structure unless explicitly requested.

## Data rules
- Preserve existing localStorage data.
- Any data migration must be backward-compatible.
- Do not wipe user grocery items, quantities, previous run data, run history, prices, categories, or settings unless explicitly requested.
- Be especially careful with `state`, `normalizeStateShape()`, import/export, and wipe/reset actions.

## Review guidelines
Flag these as serious issues:
- Version mismatch between files.
- Changelog edits to older entries.
- Any risk of wiping or corrupting localStorage data.
- Any accidental redesign outside the requested scope.
- Any broken PWA install/offline behavior.
- Any new feature that changes Build List, Shopping Mode, or Manage Items outside the stated task.
