# Changelog

## [1.23.2] - 2026-05-02

### Changed
- Updated Manage Items category folders to behave like Build List, allowing only one expanded category at a time.
- Opening a Manage Items category now automatically collapses the previously open Manage Items category.

## [1.23.1] - 2026-05-01

### Fixed
- Removed Shopping Mode category accordions so all active shopping items are visible immediately.
- Kept plain category headings in Shopping Mode while showing every nonzero item without requiring expansion.

## [1.23.0] - 2026-05-01

### Changed
- Updated Build List and Manage Items so category sections start collapsed when the app first loads.
- Kept in-session category open/closed behavior intact after the app has loaded.
- Added category state cleanup so renamed, deleted, and newly added categories stay consistent.

## [1.22.1] - 2026-05-01

### Changed
- Changed the Build List increment button from **+1** to **+** for a cleaner button layout.
- Moved **Reset all to 0** away from **Finished →** in the Build List controls.

### Added
- Added a confirmation prompt before resetting all Build List quantities to 0.

## [1.22.0] - 2026-05-01

### Changed
- Updated Shopping Mode item rows to show quantity first, followed by the item name.
- Added aligned Shopping Mode columns so quantities and item names line up vertically.

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
