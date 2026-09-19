# Unsaved-window close fix

Window close now uses the same themed modal as tab close. A single unsaved
file shows "Close filename?" and the existing unsaved-changes message. Multiple
unsaved files are listed together. Don't Save approves closing; Cancel or Escape
keeps the session open. The main process awaits this choice and retains the
native dialog only as a fallback if the renderer cannot show the themed modal.

The sandboxed Electron preload required `fs` and `path`, which are unavailable
in that context. The preload therefore failed before exposing `inkNative`.
The renderer fell back to browser mode and its `beforeunload` guard vetoed
closing even after the native Don't Save dialog was accepted.

Changes:
- `preload.js`: route synchronous Ink INCLUDE reads through IPC.
- `main.js`: perform INCLUDE reads in the main process and retain sandboxing.
- `main.js`: override renderer unload vetoes only after the main close check approves.
- `main.js`: prevent overlapping close confirmations.

Rebuild from this folder using your usual process:

```powershell
npm install
npm run dist
```

The Windows installer is generated in `dist`. An already installed executable
will not change until you rebuild and install the corrected version.

Verification: `node --test tests/close.test.js` passes ten automated tests using
mock Electron window/dialog events and the actual main/preload source. Tests
cover Don't Save with a renderer veto, Cancel and retry, repeated close clicks,
clean close, and sandbox-compatible preload INCLUDE success/error handling.
The themed-modal tests execute the actual renderer modal functions with a mock
DOM, covering discard, cancel/retry, multiple files, and modal replacement.
The packaged executable has not been built or interactively tested here.

After rebuilding: edit a node and immediately close the window; Cancel should
retain the session, and closing again with Don't Save should exit. Also check
Save and a story with an INCLUDE directive.
