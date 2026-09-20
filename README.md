<p align="center">
  <img src="ink-node-editor/assets/icon.png" width="160" alt="Inkblots logo">
</p>

# Inkblots

Inkblots is a visual desktop editor for [Ink](https://www.inklestudios.com/ink/)
interactive-fiction scripts. It turns knots and stitches into cards, diverts into
connections, and choices into structured rows while keeping ordinary `.ink` text
as the source of truth.

> Inkblots is an independent project and is not affiliated with Inkle.

[Download the latest Windows release](https://github.com/leoedson1/inkblots/releases/latest)

## Highlights

- Arrange knots and stitches on an infinite canvas with draggable connections.
- Edit story prose and choice text directly on nodes or use the highlighted Ink inspector.
- Display nested choices, gathers, branch responses, conditions, and variable effects in context.
- Organize large stories with auto-fitting zones, sticky notes, search, and a minimap.
- Manage global variables, constants, and lists from the inspector.
- Compile and play stories with `inkjs`, including fresh-state testing from a selected knot.
- Open several `.ink` files in tabs and reopen recent files from disk.
- Use the interface in English, Japanese, Simplified Chinese, or Brazilian Portuguese.

## Ink compatibility

Inkblots reads and writes regular `.ink` files. Canvas positions and organization
are stored in removable Ink comments, so the story remains compatible with Inky,
inklecate, Unity integrations, and other Ink runtimes.

```ink
// --- Inkblots layout (safe to delete) ---
// @layout {"forest":[410,80],"cottage":[740,260]}
```

Deleting Inkblots metadata only resets the visual layout; it does not remove story content.

## Install

Download the Windows installer from the
[latest release](https://github.com/leoedson1/inkblots/releases/latest).

macOS and Linux packaging is configured, but this repository currently publishes
only the tested Windows build.

## Run from source

Inkblots requires a current Node.js installation.

```powershell
cd ink-node-editor
npm install
npm start
```

Create a platform installer with:

```powershell
npm run dist
```

## Development

The Electron application lives in [`ink-node-editor`](ink-node-editor). Useful checks include:

```powershell
cd ink-node-editor
npm test
npm run test:design
npm run test:choices
npm run test:canvas
npm run test:languages
```

See the [detailed editor and architecture documentation](ink-node-editor/README.md)
and [release history](CHANGELOG.md) for more information.

## Project status

Inkblots is under active development. Back up important stories and keep the
original `.ink` files under version control, especially while trying new releases.
