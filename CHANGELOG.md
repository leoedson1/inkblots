# Changelog

Each completed change receives a version and a dated entry here. Versions match
`ink-node-editor/package.json` and its lockfile.

## [0.10.2] - 2026-09-20

- Add complete Japanese, Simplified Chinese, and Brazilian Portuguese versions
  of the public README, with four-language navigation on every version.

Validation: all 28 unit tests passed; the version check confirmed that the
package, lockfile, and changelog agree; every localized README link resolves and
no merge-conflict markers remain.

## [0.10.1] - 2026-09-20

- Add a public-facing GitHub README with an overview, feature highlights, Ink
  compatibility notes, installation and source-development instructions, and
  links to the latest Windows release and detailed project documentation.

Validation: all 28 unit tests passed; the version check confirmed that the
package, lockfile, and changelog agree; all repository-relative README links and
the displayed application icon resolve locally.

## [0.10.0] - 2026-09-20

- Align Ink flow, editing workflows, inspector controls and story data management.
- Choice cards now preserve branch ownership: expandable response text, editable output-only prose, nested choices, separate choice groups, gather continuations, and effects at their source position. Conditional-block branches no longer masquerade as gathers; spaced nested gathers retain the correct connection owner.
- Keep the node-level exit beside prose and label it as continuation after choices. Revised DONE and fallback-choice explanations distinguish tunnel returns and automatic choice availability.
- Add fresh-state testing with optional literal number, boolean and string overrides; these never modify the script. Ordinary Play and Ctrl+Enter start at the beginning; functions cannot be tested as story entry points.
- Retain Full script drafts per tab across dismissal and tab switching. Pending drafts mark the file unsaved, block saving until applied and participate in close warnings. They are session data, not disk backups.
- Add a persistent, mouse/keyboard-resizable inspector split; consistent narrative typography; editable-text hover cues; explicit rename buttons; larger control hit areas; named close buttons; and noninteractive styling for information tags.
- Add Constants and Lists sections to the global manager, Ink value suggestions and list initial-selection checkboxes. Names have inline validation; deletion asks for confirmation with reference counts and undo feedback. Escape cancels edits consistently, with Ctrl+Enter finishing multiline inspector edits.
- Search counts and navigates matches; Ctrl+A selects canvas nodes outside editors; Group/Delete menu availability follows selection. Open Recent supports individual removal and locating replacement files.
- Updated the guide, hotkeys and Japanese, Simplified Chinese and Brazilian Portuguese translations.

Validation: 28 unit tests, 43 new design/workflow assertions, 39 existing node/manager/recent checks, 42 choice/tooltip checks, 62 canvas assertions, 48 language checks, workspace lifecycle checks, and inspector alignment at four zoom levels passed. QA captures were redirected to a temporary folder after D: command writes failed with EBADF. Light/dark and compact-window screenshots were inspected. The tooltip test now waits for native scroll events to settle before hovering.

Release: the versioning command succeeded in a temporary local checkout after the project-folder run failed with EBADF; its synchronized version changes were applied back to this project. The Windows installer was built there and copied to `ink-node-editor/dist/Inkblots Setup 0.10.0.exe`. Its packaged version and all 17 source/icon files were verified against the project. Installation was not tested. Git writes subsequently succeeded in the original repository, on branch `codex/design-consistency`; this release also records the previously uncommitted 0.9.0 work.

## [0.9.0] - 2026-09-20

- Replace variable cards with a global manager, edit story text directly, and add Open Recent
- Removed variable canvas cards and left-side choice inputs. Existing declarations, assignments, conditions and named diverts remain in Ink source.
- Split the inspector equally: script editing above and a global VAR manager below. Variables can be added, renamed, given initial values and deleted, with undo. Renaming updates Ink references; deletion leaves references for manual revision.
- Node prose and choice labels now edit literal story text in place. Enter finishes and Escape cancels. Markers, conditions, output-only text, comments and divert targets are preserved; typed literal brackets are escaped. Empty nodes accept prose without exposing structures.
- Sticky choices use a plain + marker. Start deletion displays a translated, non-blocking bottom warning; other selected nodes remain deletable.
- Added File → Open Recent with twelve persisted paths, fresh disk reads, existing-tab activation that preserves unsaved edits, missing-file feedback and history clearing.
- Updated the guide and Japanese, Chinese and Brazilian Portuguese translations.

Validation: all 39 editor/manager/recent-file checks passed, including real pointer typing, source preservation, compilation, undo/cancel, tab isolation, save-before-blur, fresh disk reads, missing paths and the Start toast. All 26 unit tests, 42 choice checks, 48 language checks, workspace checks and inspector alignment at four zoom levels passed. All 62 canvas assertions passed; its subsequent screenshot export failed with a local EBADF file-handle error. Separate workflow screenshots were exported and visually reviewed. The release-version script ran in a writable staging copy after the same file-handle problem blocked its project writes; generated version changes were applied back to source.

Build: Windows installer `Inkblots Setup 0.9.0.exe` generated in `C:/Users/user/AppData/Local/Temp/inkblots-release-0.9.0/ink-node-editor/dist`. Packaged version, changed renderer files and unchanged icon verified against source. Installation was not tested. Project-folder writes still fail (including installer copy and Git index.lock creation), so this release remains uncommitted and untagged pending filesystem recovery.

## [0.8.0] - 2026-09-20

- Add direct node editing, variable connections, choice inputs, and batch deletion

- Restored the shared header and prose styling on choice cards. One-time choices have a * marker; sticky choices have a circled + marker.
- Double-click nodes to edit Ink directly. Ctrl+Enter or blur finishes; Escape cancels. Draft text is saved immediately and each editing session supports undo.
- Added Variable node to Story and cursor insertion menus. Existing VAR declarations also get cards with editable initial values and persistent canvas positions.
- Drag variable outputs to normal nodes to insert assignments on entry, or to left-side choice inputs to insert conditions. Assignment/condition tags expose the generated source and offer removal. Dashed wires are derived from source references and survive edits and save/reload.
- Normal divert connections can target choice inputs via named choice labels. Such diverts enter the named branch directly; variable conditions control choice availability.
- Delete/Backspace, the Edit menu and selection toolbar delete all selected story nodes and their child stitches with one confirmation and one undo step. Start is preserved; zone membership is restored by undo.
- Updated the user guide, hotkeys guide and Japanese, Chinese and Brazilian Portuguese UI translations.

Validation: 42 new Electron node/variable checks passed, including runtime assignment and conditional-choice behavior, direct typing and save-before-blur, undo/cancel, source-backed link persistence, actual variable drag/drop, value editing, and batch deletion/cancel/undo with stitches and zones. All 26 unit tests, 42 existing choice checks, 62 canvas checks, 48 language checks, workspace checks and inspector alignment at four zoom levels passed. Variable cards and condition tags were visually reviewed in light and dark themes.

Build: Windows installer `Inkblots Setup 0.8.0.exe` generated successfully from clean staging. Packaged version, all changed renderer modules and unchanged icon verified against source. Installer installation was not tested.

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
