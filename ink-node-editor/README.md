# Inkblots

## Canvas tools

- **Shift + left-drag** draws a selection box. Drag one selected node to move the selection; use **Group into zone** to enclose it in a named zone.
- **Story → Group selected nodes** or **Ctrl+G** creates a zone immediately. Drag its header to move its member nodes and double-click its title to rename. Populated zones fit their nodes automatically, expanding and contracting; only empty zones have a manual resize handle. The plus/minus buttons add/remove selected nodes. Removing a zone keeps its nodes.
- **Story → Sticky note** adds an editable note. Drag its header, resize its corner, or cycle its color with the dot button.
- Hover or focus a node's **comment balloon** to see its line/block comments, separated by dividers. Divert pills also show their inline comments on hover.
- **Shift+A** (outside text inputs), or **right-click empty canvas**, opens a searchable Ink insertion menu at the cursor. Search names or descriptions; use arrow keys, Enter, and Escape. Notes and zones are available there too.
- The **bottom-left minimap** shows nodes, zones, notes, and the viewport. Click/drag it to navigate, or focus it and use arrow keys.

Zones and sticky notes are stored in a `// @inkblots` metadata comment in the
saved `.ink` file alongside the existing layout metadata. They participate in
document undo/redo and do not enter the playable story. Keep that metadata when
editing files externally if you want to retain canvas organization. Existing
Inkweave layout metadata remains compatible; the installer application identifier
is retained for upgrade continuity.

A desktop editor for [Ink](https://www.inklestudios.com/ink/) scripts that shows the story as a graph. Knots and stitches are nodes, diverts are the wires between them. Everything you do on the canvas edits plain `.ink` text, so files stay compatible with Inky, inklecate and every Ink runtime.

## Run it

```bash
npm install
npm start
```

To build installers (.dmg / .exe / AppImage):

```bash
npm run dist
```

## What it does

**The graph.** Each `=== knot ===` and `= stitch` becomes a card showing its opening prose and its exits. The prose preview shows only what a player would actually read — diverts, thread markers, choice conditions, tags, and comments are stripped out of it, since they already have their own tag-style representation on the same card, and repeating them as raw leftover syntax underneath just says the same thing twice. Any `VAR`, `CONST`, or `LIST` a knot declares gets a small green tag of its own between the header and the prose, rather than showing up as a stray declaration line in the middle of the story text. Exit pills are colour-coded: indigo for a plain divert, gold for a choice, teal for a thread (`<- knot`), violet for a tunnel (`-> knot ->`) and for `END` / `DONE`, red for a target that doesn't exist. A dashed grey line shows content falling through from a knot into its first stitch.

**Editing.**

| Action | How |
| --- | --- |
| Rewire a divert | Drag its pill onto another card |
| Add a divert | Drag the `+` handle on a card's right edge onto another card |
| Create a knot | Double-click empty canvas, or drop a wire on empty canvas |
| Fix a broken link | Click the red pill to create the missing knot |
| Rename | Edit the name in the inspector — every divert pointing at it is rewritten |
| Move around | Drag the background to pan, scroll to zoom, `Fit` to frame everything |

The inspector on the right is a normal Ink text editor with syntax highlighting, filling the panel down to the row of buttons at the bottom; the graph updates as you type. Drag the thin strip at the panel's left edge to make it wider or narrower — the width is remembered across reloads and re-clamps automatically if the window gets too narrow for it. `Source` opens the whole script as one file if you'd rather work that way — edit there and apply, and the graph rebuilds.

**The Ink menu.** The same idea as Inky's: a menu of common Ink structures, grouped as Basic structure, Choices, Variables, Inline logic, Multi-line logic, Comments, List handling, Useful functions, Useful systems and Full stories. It appears in the integrated app menu and the searchable cursor menu, both built from `renderer/snippets.js`.

Each entry knows where it belongs rather than dropping text wherever the cursor happens to be, and the label in the menu says which it is:

- *at cursor* — inserted into the selected knot, indented to match the line it lands on. Placeholder names arrive selected, so typing replaces them.
- *globals* — `VAR`, `CONST`, `LIST` and `EXTERNAL` go to the top of the file, under any declarations already there, rather than into whatever knot you were editing.
- *new stitch* / *new knots* — structural entries become cards on the canvas. The four under Useful systems (a hub with returning spokes, a conversation with topics, a stat check with a dice roll, an inventory built on a list) arrive as several knots, already positioned, already wired to the knot you had selected, and with any list or variable they need added to the globals.
- *replaces file* — the entries under Full stories swap in a complete story, after asking.

New knots and stitches are created with a `-> DONE` in them, because Ink treats an empty one as an error and an editor that breaks your build the moment you add a node is no fun.

**Tabs.** Several `.ink` files can be open at once — click the `+` at the end of the tab bar, or `Open…` (which now supports selecting several files at once, and also accepts files dropped straight onto the window). Each tab keeps its own graph, selection, pan/zoom, and undo history, completely independent of the others. Closing a tab with unsaved changes asks first; there's always at least one tab open, so closing the last one just leaves you with a fresh blank one rather than an empty window.

Because tabs exist now, `New` and `Open` no longer discard anything — they used to silently replace whatever was open, which is exactly the kind of thing this rewrite was worth doing to fix. Opening a file while looking at an untouched blank tab reuses that tab instead of leaving an orphan one behind, the same courtesy VS Code extends to an empty Untitled tab.

In the desktop app, `Ctrl+W`/`Cmd+W` closes the current tab and `Ctrl+Tab` / `Ctrl+Shift+Tab` cycle between tabs — these are wired through the native menu rather than the in-page keyboard handler, since Ctrl+W and Ctrl+Tab are ordinarily reserved by browser chrome, so they can't be relied on in the plain browser build; there, the tab bar itself is the way to switch and close. Double-clicking a second `.ink` file, or passing several as command-line arguments, opens them as tabs in the *same* window rather than starting a second copy of the app — Inkblots now enforces a single instance for exactly this reason.

**Play.** `Play` compiles with inkjs and runs the story in a drawer, exactly like Inky's preview. `Play from here` on any node jumps straight into that knot. Compile errors appear in a Problems panel; clicking one selects the node it came from. `INCLUDE`d files are resolved from disk relative to the open file.

**Shortcuts.** `Cmd/Ctrl+S` save, `Cmd/Ctrl+O` open, `Cmd/Ctrl+N` new tab, `Cmd/Ctrl+W` close tab (desktop app only), `Ctrl+Tab` / `Ctrl+Shift+Tab` next/previous tab (desktop app only), `Cmd/Ctrl+F` find, `Cmd/Ctrl+Enter` play, `Cmd/Ctrl+Z` undo, `Delete` remove the selected node.

**Closing.** With unsaved changes anywhere, closing the window (the OS close button or File → Close Inkblots) shows a themed unsaved-changes dialog listing which ones, rather than saving silently or losing anything without warning. Choosing "Don't Save" closes for real; there's no "save all and quit" option yet — cancel, save the tabs you care about, then close again.

**The Ink menu.** The same idea as Inky's own Ink dropdown: a menu of common Ink structures and idioms, grouped the same way Inky groups them — Basic structure, Choices, Variables, Inline logic, Multi-line logic, Comments, List handling, Useful functions, Useful systems, Full stories. It is in the integrated app menu and searchable cursor menu, both built from `renderer/snippets.js`. Hovering over an entry for half a second shows a tooltip by the cursor explaining what it does. Most entries insert Ink syntax at the cursor or into the story's globals; the ones under Useful systems (a hub with returning spokes, a conversation with topics, a stat check, a list-based inventory) instead create several already-wired knots on the canvas, since that's where a node editor actually earns its keep over plain text. Full stories open as a new tab rather than replacing what's open.

## How your file is treated

The `.ink` file is the only source of truth — there is no side-car project format. Node positions are stored in one comment at the end of the file:

```ink
// --- Inkblots layout (safe to delete) ---
// @layout {"forest":[410,80],"cottage":[740,260]}
```

Inky and inklecate ignore it. Delete it and Inkblots lays the graph out automatically.

Round-tripping was checked against the 198 test scripts in the inkjs repository: all 178 that compile produce byte-identical compiled JSON after being parsed into nodes and written back out. The one formatting change Inkblots makes is normalising to a single blank line between knots.

Diverts to variables, parameters and knots inside `INCLUDE`d files are shown as plain pills rather than errors, since their targets can't be known from one file.

## Layout of the source

```
main.js            Electron main process — window, menus, file dialogs
preload.js         the only bridge to the filesystem (contextIsolation stays on)
renderer/
  index.html       markup
  style.css        theme tokens, canvas, cards
  app.js           parser, graph model, canvas, tabs, inspector, compiler, player
  snippets.js      the Ink catalogue for the app and cursor menus
```

`renderer/index.html` also runs standalone in a browser; it falls back to file-picker open and download-to-save, and loads the compiler from a CDN.

`window.Inkblots` exposes `{ State, Tabs, activeTab, parse, serialize, load, compile, addTab, switchTab, closeTab }` in the devtools console if you want to script it. `State` always points at whichever tab is currently active.

## What this doesn't do (yet)

Sessions aren't restored across restarts in the desktop app — each launch starts with one tab, same as before tabs existed. (The browser build's autosave-to-localStorage does cover a page refresh, since that was already there for the single-document version and now just covers every open tab instead of one.) There's also no way to open a second, separate *window* — multiple files always share one window's tab bar. Both are reasonable follow-ups if you want them, just not things this pass added.

Help → Inkblots user guide contains a quick editor reference. Ink → Full stories → Full Feature Demo demonstrates the language and canvas tools. Ctrl+G immediately groups selected nodes; double-click the zone title to rename. Zones expand and contract to fit their member nodes.

## Language and help

The interface supports English, Japanese, Simplified Chinese and Brazilian Portuguese.
On first launch, it follows the preferred system language reported by Electron's
`app.getPreferredSystemLanguages()` (browser builds use `navigator.languages`).
The **Language** menu can select a language explicitly or return to **System default**.
The choice is saved locally and applies immediately without reloading or replacing
open documents. Unsupported system languages fall back to English.

Menus, controls, app dialogs, snippet labels/descriptions, tooltips, the user guide
and **Help → Hotkeys guide** are translated. Ink keywords, example story prose,
user-authored content and inkjs compiler diagnostics retain their original text.
Native operating-system dialog controls follow the OS language; the app supplies
translated titles, filter names and primary button labels.

Localization uses explicit UI bindings in `renderer/i18n.js` and dictionaries in
`renderer/locales.js`; it never translates the editor DOM indiscriminately.
Run `npm run test:languages` for Electron language switching and content-preservation
checks. The Full Feature Demo remains available under Ink → Full stories.

## Choice cards and icon

Nodes with choices show scene prose above separated option rows, with one right-edge
connector per explicit exit. Choice text is shown once, without Ink choice markers,
leading availability conditions or square brackets. Drag a filled connector to
rewire its divert; hollow connectors indicate choices that continue within the node.
Nested choices are indented, and shared gather prose stays below the options.
All choice rows remain visible, including stories with more than nine options.
This is a display change: the original Ink source and story behavior are preserved.

The supplied Inkblots artwork is stored unchanged in `assets/icon.png` and used for
the Electron window, executable/installer packaging and browser favicon.
Run `npm run test:choices` for rendered rows, connector alignment and rewiring checks.
