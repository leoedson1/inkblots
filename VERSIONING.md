# Version control

The Inkblots repository lives in this folder. The Electron application lives in
`ink-node-editor`; the root HTML/CSS/JS prototype is preserved separately.

Every completed, documented change gets a new version, a changelog entry, a Git
commit, and an annotated `vX.Y.Z` tag after validation. Do not bump versions for
each intermediate edit. Never reuse a published version or move an existing tag.
Use patch for fixes, maintenance, and documentation; minor for new features;
major for breaking changes. A version identifies source; it does not imply an
installer has been built or tested.

From `ink-node-editor`:

```powershell
npm ci
npm run release:version -- patch "Describe the completed change"
npm test
npm run check:version
```

The version command updates package.json, package-lock.json, and the root
CHANGELOG.md together. Use `minor` or `major` instead of `patch` when appropriate.
Expand the generated changelog entry with user-facing details and actual validation.

From the repository root, review and commit the intended files:

```powershell
git diff
git status --short
git add CHANGELOG.md ink-node-editor
git commit -m "vX.Y.Z: describe the change"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
```

Replace X.Y.Z with the new package version. Use short-lived branches for larger
changes and keep each completed change in a focused commit. Include any changed
root documentation explicitly when staging. Do not commit dependencies, generated
installers, ZIPs, secrets, or logs. Commit package-lock.json for reproducible installs.

Build with `npm run dist` from `ink-node-editor`. The version check runs before
building; electron-builder uses package.json's version for the installer. Existing
0.1.0 installers are unchanged until rebuilt. Record manual testing honestly.

Git history is local until a remote repository is configured. No remote publishing
or cloud backup is configured by this setup.
