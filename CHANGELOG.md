# Changelog

## v1.52.0 — Smart suggestions foundation

- Added a Suggested mode to Build List using committed run history.
- Added simple suggestion reasons such as often bought, recently bought, and maybe due soon.
- Kept suggestions user-controlled with no automatic quantity changes.
- Matched Suggested mode quantity controls to the existing Build List controls for consistency.
- Preserved Build List All items and Last run modes, Shopping Mode, Insights, Run History, Manage Items, Manage Categories, Manage Stores, receipt pricing, localStorage keys, and JSON backup compatibility.

## v1.51.0 — Item-first item editing model

- Reworked Manage → Items editing into a clearer item-centered edit panel.
- Kept item name, category, and manual Avg $ editing available from the item edit flow.
- Added basic store assignment for grocery items using existing Manage → Stores data.
- Preserved item IDs, categories, stores, run history, receipt price entries, localStorage keys, and JSON backup compatibility.
- Preserved Build List, Shopping Mode, Insights, Run History, Data Safety / Backup, Reorder Items, and Reorder Categories behavior.

## v1.50.0 — Receipt price entry and rolling average price

- Added receipt price entry from expanded Run History entries.
- Added receipt total and unit price tracking for committed run items.
- Added item price entry history for receipt-derived prices.
- Updated item Avg $ from the most recent 5 receipt price entries.
- Updated Run History totals and missing-price indicators to account for receipt-entered prices.
- Preserved existing Build List, Shopping Mode, Insights, Run History, Manage Items, Manage Categories, Manage Stores, localStorage behavior, and JSON import/export compatibility.

## v1.49.0 — Dedicated stores foundation

- Added a dedicated Stores section inside the Manage tab.
- Added simple store creation and editing.
- Added store data to the app state for future item-to-store, store map, and route planning features.
- Added store count support to backup/data safety views where applicable.
- Preserved existing Build List, Shopping Mode, Insights, Run History, Manage Items, Manage Categories, localStorage behavior, and JSON import/export compatibility.

## v1.48.9 — Reorder arrow scroll-position fix

- Preserved scroll position when using Manage Items reorder arrows.
- Prevented item reorder actions from autoscrolling back to the top of the category.
- Preserved Reorder Items mode, Reorder Categories mode, item recategorizing, mobile item edit layout, Build List, Shopping Mode, Insights, Run History, localStorage keys, and JSON export/import compatibility.

## v1.48.8 — Mobile item edit layout fix

- Improved the mobile Manage Items edit-row layout.
- Stacked item name, Avg $, Category, Save, and Cancel controls on narrow screens so they no longer overlap.
- Kept item recategorizing, Reorder Items mode, Reorder Categories mode, Build List, Shopping Mode, Insights, Run History, localStorage keys, and JSON export/import compatibility.

## v1.48.7 — Category reorder mode

- Removed long-press drag sorting from the Manage tabs.
- Added a dedicated Reorder Categories mode with up/down controls in Manage Categories.
- Added a category selector in item edit mode so existing items can still be moved between categories without drag/drop.
- Kept item sorting in Manage Items handled by Reorder Items mode.
- Made Manage Items category headers unsortable while preserving their normal open/collapse behavior.
- Preserved Build List, Shopping Mode, Insights, Run History, localStorage keys, and JSON export/import compatibility.

## v1.48.6 — Item reorder mode

- Replaced unstable mobile item-row long-press dragging with a dedicated Reorder Items mode.
- Added up/down controls for reliable item reordering within each category.
- Prevented item rows from disappearing after failed or canceled long-press interactions.
- Preserved Manage Categories dragging, Manage Items category-header dragging, Build List, Shopping Mode, Insights, Run History, localStorage keys, and JSON export/import compatibility.

## v1.48.5 — Manage Items item drag stabilization

- Stabilized Manage Items item-row dragging on iPhone PWA.
- Prevented item rows from remaining hidden after canceled or failed drag interactions.
- Made mobile item-row dragging safer by limiting touch reordering to the original category.
- Prevented ambiguous mobile drops from accidentally moving items into the wrong category.
- Preserved Manage Categories dragging, Manage Items category-header dragging, Build List, Shopping Mode, Insights, Run History, localStorage keys, and JSON export/import compatibility.

## v1.48.4 — Mobile drag centerline and lift polish

- Changed mobile management drag/drop placement to use dragged-row centerline positioning instead of finicky release targets.
- Improved category and item reordering so drops land based on the dragged row’s projected centerline relative to other row centerlines.
- Added a custom floating drag visual for mobile management rows so dragged rows keep their normal size and styling while moving.
- Removed unnecessary drag fade behavior where the floating row visual replaces it.
- Preserved Manage Items, Manage Categories, Build List, Shopping Mode, Insights, Run History, localStorage keys, and JSON export/import compatibility.

## v1.48.3 — Mobile drag drop-zone polish

- Made mobile drag release/drop behavior more forgiving for management rows.
- Allowed dragged categories and items to land based on finger position across the visible row field instead of requiring release on a tiny target.
- Removed unnecessary sort symbols from Manage Items and Manage Categories now that full-row dragging works.
- Preserved fade-only drag feedback with no dashed blue outlines.
- Preserved Manage Items, Manage Categories, Build List, Shopping Mode, Insights, Run History, localStorage keys, and JSON export/import compatibility.

## v1.48.2 — Manage Items mobile drag behavior fix

- Improved Manage Items mobile drag behavior on iPhone PWA.
- Made Manage Items category headers draggable by holding anywhere in the header/pill instead of only the sort symbol.
- Made Manage Items item rows draggable by holding anywhere in the row/pill except actual controls.
- Prevented unwanted iOS text selection during Manage Items drag actions.
- Kept drag feedback fade-only with no dashed blue outlines.
- Preserved Manage Categories drag behavior, tab order, mobile Insights layout, Build List, Shopping Mode, Run History, localStorage keys, and JSON export/import compatibility.

## v1.48.1 — Mobile manage and insights polish

- Fixed Manage Categories drag sorting on iPhone PWA.
- Removed unwanted dashed drag highlights from category dragging visuals.
- Kept category drag feedback clean with fade-only styling while dragging.
- Improved the mobile Item Insights control layout for Date range, Sort, and Filter.
- Moved the top-level Manage tab after Insights for a cleaner navigation order.
- Preserved Manage Items, Manage Categories, Build List, Shopping Mode, Insights, Run History, localStorage keys, and JSON export/import compatibility.

## v1.48.0 — Manage tab consolidation

- Combined Manage Items and Manage Categories into one top-level Manage tab.
- Added an internal Items / Categories management switch.
- Preserved existing item editing, category editing, drag sorting, and swipe-delete behavior.
- Preserved the Data Safety / Backup panel and existing backup/import/wipe behavior.
- Preserved Build List, Shopping Mode, Insights, Run History, localStorage keys, and JSON import/export compatibility.

## v1.47.0 — Build List last-run browsing shortcut

- Added a top-of-Build-List segmented toggle for All items and Last run.
- Last run mode shows current master list items from the most recent committed run while preserving existing + / – quantity controls.
- Build List search now filters within the selected All items or Last run item pool.
- Preserved Shopping Mode skip behavior, Insights, Run History data shape, localStorage keys, and JSON import/export compatibility.

## v1.46.0 — Shopping Mode skip item option

- Added a Shopping Mode long-press interaction to skip or unskip items that cannot be found or need to be bought later.
- Skipped items fade and move out of the active shopping flow without showing a checkmark or counting as purchased.
- Committed runs continue to include only checked/purchased items; skipped item quantities remain for later.
- Preserved Build List, Manage Items, Manage Categories, Insights, Run History data shape, localStorage keys, and JSON import/export compatibility.

## v1.45.0 — Insights search polish

- Added an Insights-only item search field for Item Insights.
- Search filters item insight rows by item name live as the user types while preserving the existing date range, Sort, and Filter controls.
- Kept Run History separate from item search and preserved existing read-only Insights behavior.
- Preserved Build List, Shopping Mode, Manage Items, Manage Categories, localStorage keys, and JSON import/export behavior.

## v1.44.0 — Data safety / backup polish

- Added a Data Safety / Backup panel with app version, item count, category count, committed run count, and last backup information.
- Improved backup export wording and backup filenames.
- Tracked the last local backup export time.
- Added clearer import warnings and backup preview counts before replacing current data.
- Strengthened the wipe-all-data warning.
- Preserved existing grocery data, run history, localStorage keys, JSON import/export compatibility, and core grocery workflows.

## v1.43.2 — Add Insights Run History toggle

- Added an Insights view toggle for Item Insights and Run History.
- Made Item Insights the default Insights view.
- Showed Run History as its own Insights view instead of placing it below the item summaries.
- Preserved expandable run cards, run totals, estimated totals, missing Avg $ counts, item details, and Show more behavior.
- Preserved existing run history data, JSON import/export behavior, localStorage keys, and grocery list workflows.

## v1.43.1 — Move Run History into Insights

- Moved Run History into the Insights tab.
- Kept expandable committed run cards, item details, run totals, estimated totals, missing Avg $ counts, and Show more behavior.
- Preserved existing run history data, JSON import/export behavior, localStorage keys, and grocery list workflows.

## v1.43.0 — Run History detail expansion

- Added expandable committed run history cards.
- Added full item details inside expanded run history entries.
- Added run total quantity, estimated run total, and missing Avg $ count.
- Added a way to view more run history entries when the list is limited.
- Kept run history read-only and preserved existing grocery list, item, category, localStorage, and JSON import/export behavior.

## v1.42.0 — Insights sorting and filtering polish

- Added an Insights Sort dropdown with options for item name, purchase count, total quantity, estimated spend, and most recent purchase.
- Added an Insights Filter dropdown for all items, purchased items in the selected range, and items with missing price data.
- Kept Insights read-only and preserved the existing date-range selector.
- Preserved Build List, Shopping Mode, Manage Items, Manage Categories, run history, item data, and import/export behavior.

## v1.41.0 — Insights estimated spending summaries

- Added estimated spending summaries to Insights using committed run-history quantities and Avg $ values.
- Used saved run-item Avg $ values when available, with fallback to the current item Avg $.
- Added subtle missing-price handling for estimates that cannot fully account for every purchased quantity.
- Kept the update read-only and limited to Insights.

## v1.40.1
- Polished Manage Items drag sorting to better match Manage Categories.
- Removed the blue dashed drag-over styling from Manage Items.
- Kept item reordering on the drag handle so edit controls and swipe-delete gestures continue to work.

## v1.40.0
- Added date-range quantity summaries to the Insights tab.
- Shows total quantity, purchase count, and most recent purchase date for each item within the selected range.
- Kept Build List, Shopping Mode, and Manage Items behavior unchanged.

## v1.39.0
- Added an Insights tab for grocery purchase-frequency information based on committed run history.
- Shows purchase count, most recent purchase date, and available average price information outside of Manage Items.
- Cleaned up Manage Items by hiding Avg $ from normal item rows while keeping it editable in item edit mode.

## v1.38.5
- Hid the Shopping Mode tab on management screens where it is not part of the intended workflow.
- Preserved the Build List Finished button as the way to enter Shopping Mode.
- Kept Shopping Mode, Build List, Manage Items, Manage Categories, and saved data behavior unchanged.

## v1.38.4
- Added extra mobile clearance when editing Manage Items rows so inputs stay visible above the iOS keyboard accessory/AutoFill bar.
- Increased mobile edit input text sizing to help prevent iOS focus zoom.
- Preserved existing Build List, Shopping Mode, search, quantity, and run history behavior.

## v1.38.3
- Improved Manage Items mobile editing so the row being edited scrolls into view above the OS keyboard.
- Kept item edit controls visible when editing items near the bottom of the screen.
- Preserved existing Build List, Shopping Mode, search, quantity, and run history behavior.

## v1.38.2
- Improved long grocery item-name readability on small screens.
- Adjusted item row wrapping and spacing so long names do not crowd nearby controls.
- Preserved existing quantity, search, Shopping Mode, Manage Items, and run history behavior.

## v1.38.1
- Balanced the Build List mobile A-Z quick-scroll layout into stretched rows.
- Made Top and Search span wider grid spaces so the mobile sticky control no longer leaves Search alone on an empty row.
- Preserved the v1.38.0 A-Z/Search toggle behavior and search matching rules.

## v1.38.0
- Redesigned the Build List bottom control so A-Z quick-scroll and Search toggle between each other.
- Made A-Z quick-scroll buttons larger and easier to tap.
- Kept the Build List search behavior unchanged while saving space in the sticky bottom control.

## [1.37.2] - 2026-05-09

### Fixed
- Fixed Manage Items mobile item-name editing so Avg $ controls no longer overlap the item-name edit field.

## [1.37.1] - 2026-05-08

### Fixed
- Updated the Wipe all data confirmation to warn that committed run history will also be deleted.

## [1.37.0] - 2026-05-08

### Added
- Added Commit run history so each committed grocery run is saved with date/time, item count, total quantity, estimated committed total, missing-price count, and purchased item details.
- Added a Run history section in Manage Items showing the latest committed runs.
- Added run history to JSON exports and imports so committed run records can move with backups.

### Changed
- Commit run still updates Previous Run, clears checked purchased quantities, and leaves unchecked current quantities unchanged.

## [1.36.4] - 2026-05-06

### Added
- Added Build List A-Z focus highlighting: tapping an A-Z quick-scroll letter keeps matching letter items normal while fading non-matching rows to grey.
- Added automatic clearing of the A-Z focus when using Top, typing in search, clearing search, or pressing Escape in the search field.

## [1.36.3] - 2026-05-06

### Changed
- Tightened Build List search so it only matches item names that start with the typed letters or have a word that starts with the typed letters, including punctuation-separated words like gluten-free or salt/pepper.
- Removed category-name matches and weaker contained-letter matches from Build List search to reduce clutter.
- Hid the footer instructions and version area on Shopping Mode, Manage Items, and Manage Categories so it only appears on Build List.

## [1.36.2] - 2026-05-06

### Fixed
- Updated Build List search ranking so item names that start with the typed letters appear before weaker matches like contained letters or category matches.
- Kept secondary search matches available after stronger starts-with matches.
- Set the Build List search field to a 16px font size to prevent iPhone Safari from zooming in when the field is tapped.
- Made the bottom search/A-Z control respond to the iPhone keyboard and lift above it when possible.
- Improved footer detection so the bottom search/A-Z control lifts when the footer instructions and version area come into view.

## [1.36.1] - 2026-05-06

### Fixed
- Updated Build List A-Z quick-jump scrolling so target rows land below the sticky estimated total instead of near the bottom control.
- Updated Build List search filtering so filtered results scroll into view below the sticky estimated total.
- Made the bottom search/A-Z control reserve space based on its actual height so lower rows stay reachable on narrow phones.
- Made the bottom search/A-Z control lift upward when the footer instructions and version area come into view.

## [1.36.0] - 2026-05-06

### Changed
- Moved the combined Build List search and A-Z quick-jump control to a bottom fixed position for easier reachability.
- Kept the same single Build List search field introduced in v1.35.0; no second search field was added.
- Added extra Build List bottom spacing so lower items remain reachable above the bottom control.
- Kept item rows, Shopping Mode, individual price visibility, and estimated total behavior unchanged.

## [1.35.0] - 2026-05-05

### Added
- Added a single Build List search field inside the existing sticky A-Z quick-jump area.
- Search filters the Build List dynamically as text is typed.
- Search matches item names and category names while leaving Shopping Mode unchanged.
- Added a Clear button for quickly returning to the full Build List.

### Changed
- Kept the A-Z quick-jump controls paired with the new search field instead of adding a second search area.
- Kept the estimated total pill compact, right-aligned, and top-aligned.

## [1.34.0] - 2026-05-05

### Changed
- Split the app's inline CSS out of `index.html` into `styles.css`.
- Split the main app JavaScript out of `index.html` into `app.js`.
- Kept `index.html` as the lightweight app shell while preserving existing app behavior.
- Updated the service worker core asset list so the split CSS and JavaScript files are cached for offline use.

## [1.33.1] - 2026-05-05

### Fixed
- Updated Build List alphabet quick-jump scrolling to account for the sticky estimated total pill above the A-Z bar.
- Tapping A-Z quick-jump letters now lands target rows below the sticky navigation instead of hidden underneath it.

## [1.33.0] - 2026-05-05

### Added
- Added compact right-aligned estimated total pills to Build List and Shopping Mode.
- Estimated totals use current item quantities multiplied by saved `avgPrice` values.
- Added a `+` indicator and missing-price count when active list items do not yet have average prices.

### Changed
- Kept item-level prices hidden from Build List and Shopping Mode rows to preserve fast scanning.

## [1.32.0] - 2026-05-05

### Added
- Added optional **Avg $** fields to Manage Items rows.
- Average prices save on each item as `avgPrice` for future estimate-total features.

### Changed
- Kept Build List free of price fields so the planning screen stays fast and easy to scan.
- Left Shopping Mode totals for a later update after average price data is saved.

## [1.31.1] - 2026-05-04

### Changed
- Checked Shopping Mode items now stay in their original position within their category instead of moving to the bottom of that category.
- Fully checked categories still fade out, slide the following categories upward, and reappear greyed out at the bottom of Shopping Mode.

## [1.31.0] - 2026-05-04

### Changed
- Redesigned Shopping Mode rows into clean aligned columns: checkbox, quantity, and item name.
- Removed row boxes, quantity boxes, and the hyphen between quantity and item name.
- Added vertical divider lines between checkbox and quantity, and between quantity and item name.
- Kept divider lines and quantities aligned across the whole Shopping Mode list, including multi-digit quantities.
- Kept category headings tight without extra spacer rows between categories.
- When every item in a category is checked, the whole category block fades out, following categories slide up, and the completed category reappears greyed out at the bottom of Shopping Mode.

## [1.30.0] - 2026-05-03

### Changed
- Reduced vertical spacing between Build List item rows while keeping rows readable and tappable on iPhone.
- Added a **Top** button inside the sticky Build List quick-jump bar.
- Tapping **Top** scrolls all the way back to the top so the app title and tabs are visible again.
- Kept the flat alphabetical Build List, `# / A-Z` quick-jump letters, **Previous** column, `+ / –` controls, and swipe-left trash behavior unchanged.

## [1.29.1] - 2026-05-02

### Changed
- Removed Build List letter section headings to keep the flat alphabetical list more compact.
- Updated Build List quick-jump scrolling so the target item lands below the sticky A-Z bar instead of underneath it.

## [1.29.0] - 2026-05-02

### Changed
- Redesigned Build List as a flat alphabetical list instead of category folders.
- Removed Build List item drag handles and item drag sorting because Build List is now alphabetical.
- Added a sticky A-Z quick-jump index, including **#** for items starting with numbers or symbols.
- Grouped all non-A-Z starters under one **#** section so the **#** quick jump has a single reliable target.
- Quick-jump letters scroll directly to the first item section for that letter, while inactive letters are dimmed.
- Kept Manage Items and Shopping Mode category organization unchanged.

## [1.28.1] - 2026-05-02

### Changed
- Moved the Build List **Previous Run** value to the far right of each item row, after the **+** button.
- Updated **Previous Run** and **Now** quantity boxes to use the same size.
- Updated **Previous Run** numbers to use the same font size as **Now** while keeping them slightly greyed out.

## [1.28.0] - 2026-05-02

### Added
- Added a non-editable **Previous Run** column in Build List.
- Added a **Commit run** button in Shopping Mode.
- Committing a run resets Previous Run to 0 for all items, then saves checked item quantities as the latest run values.
- Committing a run clears quantities and checkmarks only for checked items while leaving unchecked current quantities unchanged.
- Added a confirmation prompt before committing a grocery run.

## [1.27.0] - 2026-05-02

### Added
- Added category drag sorting in Build List and Manage Items.
- Category drag sorting starts from the category ☰ handle instead of the whole category header.
- Reordered categories update the shared category order used by Build List, Manage Items, Shopping Mode, and Manage Categories.
- Items remain assigned to their existing categories when categories are reordered.

## [1.26.0] - 2026-05-02

### Added
- Added **Bulk setup tools** in Manage Items for pasting multiple master list items at once.
- Added category header support using lines ending in a colon, such as **Produce:**.
- Added automatic creation of missing categories during bulk setup.
- Bulk setup skips duplicate items using normalized spacing so existing master list items are not duplicated.

## [1.25.2] - 2026-05-02

### Changed
- Renamed the Shopping Mode **Clear checked** button to **Reset checkmarks**.
- Moved **Reset checkmarks** to the right side of the Shopping Mode controls row.
- Updated **Reset checkmarks** so it clears checkmarks only and does not change item quantities.

## [1.25.1] - 2026-05-02

### Fixed
- Updated item drag sorting so desktop dragging starts from the drag handle instead of the whole row.
- Updated desktop row dragging so dragging left can reveal the trash can.

### Removed
- Removed the old item Delete buttons from Manage Items now that swipe-left trash is available.
## [1.25.0] - 2026-05-02

### Added
- Added item drag sorting in Build List and Manage Items, including moving items between categories.
- Added swipe-left-to-reveal-trash behavior in Build List and Manage Items.
- Tapping the revealed trash can deletes the item from the master list without an extra popup confirmation or undo.

## [1.24.0] - 2026-05-02

### Added
- Added auto-scroll behavior when opening categories in Build List.
- Added auto-scroll behavior when opening categories in Manage Items.

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
