# Changelog

## [1.21.0] - 2026-05-01

### Added
- Added a **Clear checked** button to Shopping Mode.
- Checked shopping items can now be cleared from the active shopping list while remaining in the master item list.

### Changed
- Resetting all quantities to 0 now also clears checked status.
- Re-adding an item from Build List now clears any previous checked status.

## [1.20.0] - 2026-05-01

### Added
- Added in-cart checkoff behavior in Shopping Mode.
- Tapping an item now toggles a checkmark and faded state.
- Checked items move to the bottom of their category.

## [1.19.0] - 2026-05-01

### Changed
- Existing duplicate items now auto-increment quantity instead of showing a duplicate warning.
- Smart Add behavior clears the input and returns focus after incrementing.

## [1.18.1] - 2026-05-01

### Fixed
- Normalized internal spacing when checking for duplicate items.

## [1.18.0] - 2026-05-01

### Fixed
- Prevented duplicate item names within the same category.
- Duplicate checks now ignore capitalization, leading/trailing spaces, and repeated internal spaces.

## [1.17.0] - 2026-05-01

### Fixed
- Removed conflicting CSS that permanently hid the Shopping Mode tab.
- Updated version references for the cleanup release.

### Changed
- Bumped app version to 1.17.0.

## [1.16.0] - 2025-09-19

### Changed
- Shopping List is only reachable after pressing **Finished** in **Build List**.
- Shopping tab/button is hidden; Manage/Category tabs unchanged.

## v1.13.0

- Initial GitHub Pages PWA shell created.
- Add service worker, manifest, icons, and Pages config files.
