# Inkblots project instructions

The Electron application is in ink-node-editor. Use this project copy for changes.
For every completed documented change, increment the application version and update
CHANGELOG.md in the same commit. Follow VERSIONING.md. Use patch for fixes,
maintenance, and documentation; minor for features; major for breaking changes.
Run npm run release:version -- patch "Description" from ink-node-editor (adjust
bump type as appropriate); keep package.json and package-lock.json synchronized.
Run relevant checks, record their actual results, and commit the completed change
with an annotated vX.Y.Z tag after validation. Do not bump per intermediate edit.
Do not commit node_modules, dist, ZIPs, secrets, or logs. Do not publish remotely
unless the user requests it. Preserve unrelated root prototype files.
