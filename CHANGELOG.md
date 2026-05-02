# Changelog

## [1.23.0] - 2026-05-01

### Changed
- Updated Build List, Shopping Mode, and Manage Items so category sections start collapsed when the app first loads.
- Kept in-session category open/closed behavior intact after the app has loaded.
- Added category state cleanup so renamed, deleted, and newly added categories stay consistent across Build List, Shopping Mode, and Manage Items.

## [1.22.1] - 2026-05-01

### Changed
- Changed the Build List quantity increase button from **+1** to **+**.
- Moved **Reset all to 0** away from **Finished →** in the Build List controls.

### Fixed
- Added a confirmation prompt before **Reset all to 0** clears quantities.

## [1.22.0] - 2026-05-01

### Changed
- Updated Shopping Mode item layout so quantities display first in their own aligned column.
- Updated Shopping Mode item names so they align separately from quantities.
- Preserved checked-item behavior, including checkmark, fade, and checked items moving below unchecked items.

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
