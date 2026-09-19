# Changelog

Each completed change receives a version and a dated entry here. Versions match
`ink-node-editor/package.json` and its lockfile.

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
