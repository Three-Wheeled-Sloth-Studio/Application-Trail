import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { expectedIndexes, loadFrontmatter } from './generate-okf-indexes.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const REFS = path.join(ROOT, 'refs');
const RESERVED_MARKDOWN = new Set(['index.md', 'log.md']);
const OKF_STATUSES = new Set(['draft', 'stable', 'deprecated']);
const REQUIRED_FILES = [
  'refs/README.md',
  'refs/index.md',
  'refs/project.yaml',
  'refs/agents.yaml',
  'refs/okfProfile.yaml',
  'refs/planning/mvp-roadmap.md',
  'refs/planning/todos.yaml',
  'refs/planning/decisions.yaml',
  'refs/planning/openQuestions.yaml',
  'refs/implementation/fileMap.yaml',
  'refs/implementation/okfCompatibility.md',
  'refs/handoffs/currentHandoff.md',
  'refs/handoffs/next-dev-prompt.md',
  'refs/testing/validationCommands.yaml',
  'refs/tools/generate-okf-indexes.mjs',
  'refs/tools/validate-refs.mjs'
];

const errors = [];
const rel = value => path.relative(ROOT, value).replaceAll('\\', '/');
const addError = (value, message) => errors.push(`${typeof value === 'string' ? value : rel(value)}: ${message}`);

async function allFiles(directory = REFS, collected = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === '__pycache__') continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await allFiles(entryPath, collected);
    else if (entry.isFile()) collected.push(entryPath);
  }
  return collected;
}

const files = await allFiles();
const fileSet = new Set(files.map(rel));
for (const required of REQUIRED_FILES) if (!fileSet.has(required)) addError(required, 'required Application Trail Agent Academy alignment file is missing');

for (const file of files.filter(value => ['.yaml', '.yml'].includes(path.extname(value).toLowerCase()))) {
  const contents = await readFile(file, 'utf8');
  try {
    const parsed = YAML.parse(contents);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) addError(file, 'YAML root must be a mapping');
  } catch (error) {
    addError(file, `invalid YAML: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (/[A-Za-z]:\\/.test(contents)) addError(file, 'contains a Windows absolute path');
}

for (const file of files.filter(value => path.extname(value).toLowerCase() === '.md' && !RESERVED_MARKDOWN.has(path.basename(value)))) {
  const contents = await readFile(file, 'utf8');
  let metadata;
  try {
    metadata = loadFrontmatter(contents);
  } catch (error) {
    addError(file, `invalid OKF frontmatter: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  if (!metadata) {
    addError(file, 'OKF concept is missing YAML frontmatter');
    continue;
  }
  if (typeof metadata.type !== 'string' || !metadata.type.trim()) addError(file, 'OKF frontmatter must contain a non-empty type');
  if (metadata.status !== undefined && !OKF_STATUSES.has(String(metadata.status))) addError(file, `OKF status ${metadata.status} is not supported`);
  if (metadata.verified !== undefined) {
    const records = Array.isArray(metadata.verified) ? metadata.verified : [metadata.verified];
    for (const [index, record] of records.entries()) if (!record || typeof record !== 'object' || !record.by || !record.at) addError(file, `verified[${index}] must contain by and at`);
  }
  if (metadata.sources !== undefined && !Array.isArray(metadata.sources)) addError(file, 'sources must be a list when present');
}

let profile;
try {
  profile = YAML.parse(await readFile(path.join(REFS, 'okfProfile.yaml'), 'utf8'));
} catch (error) {
  addError('refs/okfProfile.yaml', `could not parse profile: ${error instanceof Error ? error.message : String(error)}`);
}
if (profile) {
  if (!profile.okf?.version) addError('refs/okfProfile.yaml', 'missing okf.version');
  if (!/^[0-9a-f]{40}$/.test(String(profile.okf?.baseline_commit ?? ''))) addError('refs/okfProfile.yaml', 'okf.baseline_commit must be a full commit SHA');
  if (profile.bundle?.root !== 'refs') addError('refs/okfProfile.yaml', 'bundle.root must be refs');
  if (!/^[0-9a-f]{40}$/.test(String(profile.agent_academy?.baseline_commit ?? ''))) addError('refs/okfProfile.yaml', 'agent_academy.baseline_commit must be a full commit SHA');
}

const expected = await expectedIndexes();
const expectedPaths = new Set(expected.keys());
for (const [indexPath, wanted] of expected) {
  try {
    const actual = await readFile(indexPath, 'utf8');
    if (actual !== wanted) addError(indexPath, 'generated OKF index is stale');
  } catch {
    addError(indexPath, 'generated OKF index is missing');
  }
}
for (const file of files.filter(value => path.basename(value) === 'index.md')) if (!expectedPaths.has(file)) addError(file, 'unexpected generated OKF index');

const rootIndex = path.join(REFS, 'index.md');
try {
  const metadata = loadFrontmatter(await readFile(rootIndex, 'utf8'));
  if (!metadata || Object.keys(metadata).length !== 1 || String(metadata.okf_version) !== String(profile?.okf?.version ?? '')) addError(rootIndex, 'root index frontmatter must contain only the matching okf_version');
} catch (error) {
  addError(rootIndex, `could not validate root index: ${error instanceof Error ? error.message : String(error)}`);
}

const assignmentPattern = /(?:api_key|access_token|secret_key|password|private_key|bearer)[^\n]*[:=]\s*['"]?[A-Za-z0-9_+/=-]{16,}/i;
for (const file of files.filter(value => rel(value) !== 'refs/index.md')) {
  const contents = await readFile(file, 'utf8');
  if (assignmentPattern.test(contents)) addError(file, 'possible secret-like value detected');
}

if (errors.length) {
  console.error('refs validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`refs validation passed (Application Trail Agent Academy/OKF profile, ${expected.size} indexes)`);
}
