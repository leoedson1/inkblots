const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');
const changelogPath = path.join(root, '..', 'CHANGELOG.md');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const changelog = fs.readFileSync(changelogPath, 'utf8');
const [kind, ...words] = process.argv.slice(2);

function fail(message) { console.error(message); process.exit(1); }
if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version)
  fail('Package and lockfile versions differ. Resolve this before continuing.');
if (!changelog.includes(`## [${pkg.version}] - `))
  fail('The current package version needs a changelog entry.');
if (kind === '--check') {
  console.log(`Version ${pkg.version}: package, lockfile, and changelog agree.`);
  process.exit(0);
}
if (!['patch', 'minor', 'major'].includes(kind) || !words.join(' ').trim())
  fail('Usage: npm run release:version -- patch|minor|major "Description of change"');
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) fail('Expected a stable X.Y.Z version.');
const parts = pkg.version.split('.').map(Number);
const index = { major: 0, minor: 1, patch: 2 }[kind];
parts[index]++;
for (let i = index + 1; i < parts.length; i++) parts[i] = 0;
const version = parts.join('.');
if (changelog.includes(`## [${version}]`)) fail('That version is already documented.');
const now = new Date();
const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
const entry = `## [${version}] - ${date}\n\n- ${words.join(' ').trim()}\n\n`;
const position = changelog.indexOf('## [');
if (position < 0) fail('No version section found in changelog.');
pkg.version = lock.version = lock.packages[''].version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
fs.writeFileSync(changelogPath, changelog.slice(0, position) + entry + changelog.slice(position));
console.log(`Updated to ${version}. Review the changelog, validate, then commit and tag v${version}.`);
