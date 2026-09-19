# Changelog

Each completed change receives a version and a dated entry here. Versions match
`ink-node-editor/package.json` and its lockfile.

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
