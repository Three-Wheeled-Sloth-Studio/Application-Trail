import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const REFS = path.join(ROOT, 'refs');
const PROFILE = path.join(REFS, 'okfProfile.yaml');
const RESERVED_MARKDOWN = new Set(['index.md', 'log.md']);
const IGNORED_DIR_NAMES = new Set(['__pycache__']);

const sortByName = values => [...values].sort((left, right) => left.name.localeCompare(right.name, 'en-US', { sensitivity: 'base' }));

export function loadFrontmatter(contents) {
  if (!contents.startsWith('---\n')) return null;
  const end = contents.indexOf('\n---\n', 4);
  if (end < 0) return null;
  const parsed = YAML.parse(contents.slice(4, end));
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
}

function humanize(value) {
  if (value.toUpperCase() === value) return value;
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/(?<=[a-z0-9])(?=[A-Z])/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function firstHeading(contents) {
  let body = contents;
  if (contents.startsWith('---\n')) {
    const end = contents.indexOf('\n---\n', 4);
    if (end >= 0) body = contents.slice(end + 5);
  }
  return body.split(/\r?\n/).find(line => line.startsWith('# '))?.slice(2).trim();
}

async function visibleEntries(directory) {
  return sortByName(await readdir(directory, { withFileTypes: true }));
}

async function visibleDirectories(directory) {
  return (await visibleEntries(directory)).filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && !IGNORED_DIR_NAMES.has(entry.name));
}

async function visibleFiles(directory) {
  return (await visibleEntries(directory)).filter(entry => entry.isFile() && !entry.name.startsWith('.') && !RESERVED_MARKDOWN.has(entry.name));
}

async function bundleDirectories(directory = REFS, collected = []) {
  collected.push(directory);
  for (const entry of await visibleDirectories(directory)) await bundleDirectories(path.join(directory, entry.name), collected);
  return collected.sort((left, right) => path.relative(REFS, left).localeCompare(path.relative(REFS, right), 'en-US', { sensitivity: 'base' }));
}

async function conceptEntry(directory, entry) {
  const contents = await readFile(path.join(directory, entry.name), 'utf8');
  const frontmatter = loadFrontmatter(contents) ?? {};
  const title = String(frontmatter.title || firstHeading(contents) || humanize(path.parse(entry.name).name));
  const description = String(frontmatter.description || 'Application Trail knowledge concept.');
  return `* [${title}](${entry.name}) - ${description}`;
}

function resourceEntry(entry, kind) {
  return `* [${entry.name}](${entry.name}) - Application Trail ${kind} resource.`;
}

function directoryEntry(entry) {
  const title = humanize(entry.name);
  return `* [${title}](${entry.name}/) - Browse ${title} knowledge and resources.`;
}

async function renderIndex(directory, okfVersion, bundleTitle) {
  const root = directory === REFS;
  const title = root ? bundleTitle : humanize(path.basename(directory));
  const lines = [];
  if (root) lines.push('---', `okf_version: "${okfVersion}"`, '---', '');
  lines.push(`# ${title}`, '', 'Generated OKF discovery index. Do not edit manually.', '');

  const directories = await visibleDirectories(directory);
  const files = await visibleFiles(directory);
  const concepts = files.filter(entry => path.extname(entry.name).toLowerCase() === '.md');
  const structured = files.filter(entry => ['.yaml', '.yml'].includes(path.extname(entry.name).toLowerCase()));
  const support = files.filter(entry => !concepts.includes(entry) && !structured.includes(entry));

  if (directories.length) lines.push('## Directories', '', ...directories.map(directoryEntry), '');
  if (concepts.length) {
    lines.push('## Concepts', '');
    for (const entry of concepts) lines.push(await conceptEntry(directory, entry));
    lines.push('');
  }
  if (structured.length) lines.push('## Structured Resources', '', ...structured.map(entry => resourceEntry(entry, 'structured')), '');
  if (support.length) lines.push('## Supporting Files', '', ...support.map(entry => resourceEntry(entry, 'supporting')), '');
  return `${lines.join('\n').trimEnd()}\n`;
}

async function loadProfile() {
  const profile = YAML.parse(await readFile(PROFILE, 'utf8'));
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) throw new Error('refs/okfProfile.yaml must contain a mapping');
  return profile;
}

export async function expectedIndexes() {
  const profile = await loadProfile();
  const version = String(profile.okf?.version ?? '');
  const title = String(profile.bundle?.title ?? 'Application Trail Knowledge Bundle');
  if (!version) throw new Error('refs/okfProfile.yaml is missing okf.version');
  const expected = new Map();
  for (const directory of await bundleDirectories()) expected.set(path.join(directory, 'index.md'), await renderIndex(directory, version, title));
  return expected;
}

async function existingIndexes(directory = REFS, collected = []) {
  for (const entry of await visibleEntries(directory)) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && !IGNORED_DIR_NAMES.has(entry.name)) await existingIndexes(entryPath, collected);
    else if (entry.isFile() && entry.name === 'index.md') collected.push(entryPath);
  }
  return collected;
}

async function checkIndexes(expected) {
  const errors = [];
  const expectedPaths = new Set(expected.keys());
  for (const [indexPath, wanted] of expected) {
    try {
      const actual = await readFile(indexPath, 'utf8');
      if (actual !== wanted) errors.push(`${path.relative(ROOT, indexPath).replaceAll('\\', '/')}: generated index is stale`);
    } catch {
      errors.push(`${path.relative(ROOT, indexPath).replaceAll('\\', '/')}: generated index is missing`);
    }
  }
  for (const indexPath of await existingIndexes()) if (!expectedPaths.has(indexPath)) errors.push(`${path.relative(ROOT, indexPath).replaceAll('\\', '/')}: unexpected generated index`);
  if (errors.length) {
    console.error('OKF index check failed:');
    for (const error of errors) console.error(`- ${error}`);
    return 1;
  }
  console.log(`OKF index check passed (${expected.size} indexes)`);
  return 0;
}

async function writeIndexes(expected) {
  const expectedPaths = new Set(expected.keys());
  for (const [indexPath, contents] of expected) await writeFile(indexPath, contents, 'utf8');
  for (const indexPath of await existingIndexes()) if (!expectedPaths.has(indexPath)) await rm(indexPath);
  console.log(`Wrote ${expected.size} OKF indexes`);
  return 0;
}

const isMain = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const expected = await expectedIndexes();
  process.exitCode = process.argv.includes('--check') ? await checkIndexes(expected) : await writeIndexes(expected);
}
