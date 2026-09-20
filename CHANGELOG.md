# Changelog

Each completed change receives a version and a dated entry here. Versions match
`ink-node-editor/package.json` and its lockfile.

## [0.7.1] - 2026-09-20

- Show structure names above inspector tooltip explanations

- Inspector hints now show a bold structure name (such as Sticky choice or Divert) above the explanation. Names follow the selected interface language.

Validation: all 42 Electron choice/tooltip checks passed, including English structure headings and Japanese translations of both name and description.

Build: Windows installer `Inkblots Setup 0.7.1.exe` generated successfully using clean staging. Packaged version and modified renderer files verified against source; installation was not tested.

## [0.7.0] - 2026-09-19

- Add bottom choice controls and inspector syntax hints; fix node-level choice exits

- New node-level exits from choice cards now sit beside the scene prose. Adding a side connection inserts a gather so it no longer belongs to the final choice.
- Hovering a node reveals a bottom + button that inserts a sticky choice, selects its label in the inspector and supports undo. New choice terminal connectors can be dragged to set their destination.
- Pausing over highlighted Ink syntax shows a localized description near the cursor. Hints cover choices, gathers, comments, declarations, logic, conditions, tags and diverts, and dismiss during editing, selection and scrolling.

Validation: 26 unit tests, 42 Electron choice/tooltip checks, 62 canvas checks, 48 language checks, workspace/menu checks and inspector alignment at four zoom levels passed. New checks cover source compilation, connection ownership and position, choice insertion/undo, delayed hints, scroll/wrap hit testing and translated descriptions. Light and dark node screenshots were visually reviewed.

Build: Windows NSIS installer `Inkblots Setup 0.7.0.exe` generated from a clean staging folder after malformed unrelated directory names prevented direct packaging. Packaged version, modified renderer files and unchanged icon verified against source in app.asar. Installer installation was not tested.

## [0.6.0] - 2026-09-19

- Display choices as divided node rows with edge connectors and add the Inkblots app icon

- Choice nodes now follow the supplied sketch: scene prose, divided choice rows and right-edge output dots. Choice labels are no longer repeated in prose and target pills.
- Retains direct, multiline and nested choice exits, multiple exits per row, and all choices beyond the previous nine-pill display limit. Hollow dots distinguish local continuation; shared gather prose remains below the rows.
- Connectors retain drag-to-rewire, broken-target creation and inline comment previews. Anchors follow the individual row at different zoom levels while keeping the existing spline routing.
- Added the supplied Inkblots artwork unchanged as the application/window icon and packaging icon, plus the browser favicon.

Validation: 26 unit tests and 25 Electron choice-card checks passed, covering source preservation, direct/nested/multiline/local choices, output-only text, comment handling, twelve options, shared gathers, connector positions at three zoom levels, rewiring/undo, save/reload and zone fit. Existing 62 canvas checks, 48 language checks, workspace/menu checks and inspector alignment at four zoom levels passed. Choice-card screenshots were visually reviewed.

Build: Windows NSIS installer `Inkblots Setup 0.6.0.exe` generated successfully on retry after an initial packaging failure. Packaged version, choice renderer and unchanged supplied PNG verified in app.asar; the executable icon was extracted and visually checked. Installer installation was not tested.

## [0.5.0] - 2026-09-19

- Fit zones to their nodes and add multilingual UI, hotkeys help, and Full Feature Demo naming

- Populated zones now expand and contract to the exact member bounds with header/padding space. Moving nodes inward, removing members, undo/redo and rendered node-size changes keep the group fitted. Only empty zones retain manual resize handles.
- Added Help → Hotkeys guide and renamed The Lantern Archive example to Full Feature Demo.
- Added Japanese, Simplified Chinese and Brazilian Portuguese UI translations, including menus, controls, prompts, status messages, tooltips, the user guide, hotkeys guide and all Ink snippet labels/descriptions.
- Detects the preferred OS language through Electron's system-language API. The Language menu provides a persistent manual override and System default option; changes apply without reloading open files. Unsupported languages fall back to English.
- UI translation uses explicit bindings; Ink syntax, filenames, authored story text, comments, zones and notes are preserved. Native fallback confirmations follow the selected UI language, and close confirmations remain visible when a help dialog is open.

Validation: 21 unit tests passed, including translation-key/interpolation coverage, snippet coverage, native fallback localization, close behavior and all showcase routes. All 62 hidden Electron canvas checks and 48 language checks passed, including contraction, member removal, undo, system detection, live switching, persistence, authored-content preservation and minimum-window layout. Workspace/menu checks and inspector alignment at four zoom levels passed. Japanese, Chinese and Portuguese help screenshots were visually inspected.

Build: Windows NSIS installer `Inkblots Setup 0.5.0.exe` generated successfully. Packaged product/version and translation, guide, canvas, main-process and preload files verified against source in app.asar. Installer installation was not tested.

## [0.4.0] - 2026-09-19

- Improve grouping and naming, add the Inkblots user guide and Lantern Archive showcase

- Zones expand on every side when member nodes move or grow, including shared groups, and cannot be resized to clip members. Extra manually added space is preserved.
- Ctrl+G creates a group immediately with a unique default name; double-click its title to rename later.
- Comment balloons no longer show a delayed native tooltip; the custom Comments header displays the count.
- New layout metadata uses Inkblots branding. Browser preferences migrate to Inkblots keys; legacy files remain readable. The installer ID remains unchanged for update continuity.
- New untitled tabs reuse the lowest available name, beginning with Untitled.ink.
- Added Help → Inkblots user guide and Ink → Full stories → The Lantern Archive, a playable showcase with zones, notes, comments, branching choices, lists, variables, stitches, tunnels, functions, tags and text variations.

Validation: 17 unit tests passed, including four complete showcase routes and early departure. All 56 hidden Electron canvas checks passed, including four-direction zone containment with undo, immediate Ctrl+G grouping, comment header count, legacy metadata, untitled naming gaps, guide opening/closing, and showcase loading/compilation. Existing workspace checks and inspector alignment at four zoom levels passed. The guide screenshot was visually inspected. Windows NSIS installer `Inkblots Setup 0.4.0.exe` built successfully; packaged name/version and guide verified in app.asar. Installer installation was not tested.

## [0.3.0] - 2026-09-19

- Rename the app to Inkblots and add canvas organization, comments, quick insertion, and minimap

- Renamed the application, window title, menus, and installer to Inkblots; retained the installer application ID and legacy layout markers for continuity.
- Added Shift + left-drag box selection and undoable movement of multiple selected nodes.
- Added named, colored zones with resize handles, member-node dragging, membership controls, and rename/removal actions.
- Added movable, resizable, colored sticky notes. Notes and zones save in compiler-safe Ink metadata, remain separate per tab, and participate in undo/redo.
- Added top-right comment balloons on nodes, with divided hover/focus previews; divert pills also preview inline comments. Block-comment examples no longer create phantom graph nodes or diverts.
- Added a searchable cursor Ink menu on Shift+A or right-clicking empty canvas, with keyboard navigation and node insertion at the cursor. Notes and zones are also available through this menu and Story.
- Added a bottom-left minimap with viewport indication and pointer/keyboard navigation.

Validation: all 12 unit tests passed. Hidden Electron canvas checks cover selection at two zoom levels, group movement/resizing, note editing/dragging, serialization/reopen, source edits, tab isolation, rename membership, undo/redo, comment dividers, searchable insertion, and minimap keyboard navigation. Both compiled output and the saved Ink file containing metadata compile successfully. Existing workspace/menu checks and inspector alignment checks at four zoom levels passed. Dark/light canvas screenshots were visually inspected.

Build: Windows NSIS installer `Inkblots Setup 0.3.0.exe` generated successfully; packaged product name, version, and canvas module verified in app.asar. Installer installation was not tested.

## [0.2.0] - 2026-09-19

- Integrate menus into the app header and restore the original spline routing

- Replaced the separate native menu/title rows with an in-app File/Edit/View/Story/Ink/Window/Help header and native overlaid window controls. Blank header space drags the window.
- Removed duplicate toolbar commands from view; kept search, graph zoom/fit, and Play directly accessible.
- Preserved Ink descriptions on hover and keyboard focus. Added menu keyboard navigation, F10/Alt+F access, document shortcuts, and native edit/window actions with sender validation.
- Restored the spline path and drawing functions exactly to v0.1.2, retaining the empty workspace and other fixes.

Validation: all 12 unit tests passed. Hidden Electron checks passed for menu navigation, Ink tooltip handling (with simulated focus in the hidden window), Edit selection preservation, New/Close shortcuts, empty workspace, original cubic routing, 900px header layout, light theme, and inspector alignment at four zoom levels. Menu and light-theme screenshots were inspected. Native drag/resize and window buttons were not manually exercised.

Build: Windows NSIS installer generated successfully; packaged version, custom menu script, and hidden title-bar configuration verified in app.asar. Installer installation was not tested.

## [0.1.3] - 2026-09-19

- Keep an empty workspace after closing the last tab and improve connection routing

- Closing the final tab now shows New file, Open file, and Close Inkweave instead of creating another untitled tab. Editing controls and shortcuts remain inactive until a file is opened or created.
- Forward links use bounded smooth curves; backward and self-links use rounded routes outside their endpoint cards instead of fixed looping curves.
- Added Electron workspace checks and a regression check for the native close request.

Validation: all 11 unit tests, Electron workspace/routing checks, and inspector checks at four zoom levels passed. Empty-workspace and routing screenshots were visually inspected.

Build: Windows NSIS installer generated; packaged version and both fixes verified in app.asar. Installer installation was not tested.

## [0.1.2] - 2026-09-19

- Fixed inspector text selection alignment by matching the highlighted code and textarea fonts.
- Added a hidden Electron rendering check for font metrics, wrapping widths, scrolling, and selection at three inspector widths and four zoom levels.

Validation: reproduced the font-family mismatch in Electron before the fix; the rendering check passes after the fix at 80%, 100%, 125%, and 150% zoom. All ten existing regression tests pass.

Build: Windows NSIS installer generated successfully; packaged app.asar verified to contain version 0.1.2 and the font-inheritance fix. Installer installation was not tested.

## [0.1.1] - 2026-09-19

- Fixed Electron's sandboxed preload so native file operations initialize correctly.
- Fixed Don't Save failing to close a window with unsaved edits.
- Reused the editor's themed confirmation modal for window close, including multiple unsaved files.
- Preserved Cancel behavior and prevented overlapping close confirmations.
- Added ten automated close-flow and preload regression checks.
- Established Git tracking, dependency locking, and a documented version-bump workflow.

Validation: ten automated tests passed. No packaged executable validation was performed for this version.

## [0.1.0] - Imported source

- Original supplied Inkweave desktop editor. No earlier Git history was provided.
