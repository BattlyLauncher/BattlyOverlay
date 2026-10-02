const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const version = fs.readFileSync('VERSION', 'utf8').trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('Invalid version');
const repo = process.env.GITHUB_REPOSITORY,
  sha = process.env.GITHUB_SHA,
  tag = 'v' + version;
if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo) || !/^[a-f0-9]{40}$/.test(sha || ''))
  throw Error('Missing GitHub build identity');
const gh = (args) =>
  execFileSync('gh', args, { encoding: 'utf8', timeout: 60000, windowsHide: true });
// A failed API call is a failure, never evidence that the release does not exist.
const pages = JSON.parse(
  gh(['api', `repos/${repo}/releases?per_page=100`, '--paginate', '--slurp']),
);
const existing = pages.flat().find((release) => release.tag_name === tag);
if (existing && !existing.draft) {
  console.log(
    `${tag} already published. Change VERSION and package.json to publish another release.`,
  );
  process.exit(0);
}
if (existing)
  throw Error(
    `${tag} is a draft from an earlier attempt. Inspect/remove that draft before retrying; published assets are never overwritten.`,
  );
const files = fs
  .readdirSync('release')
  .filter((file) => file.endsWith('.zip') || ['manifest.json', 'SHA256SUMS'].includes(file))
  .sort()
  .map((file) => 'release/' + file);
if (files.length !== 8) throw Error('Expected six archives, manifest and SHA256SUMS');
gh([
  'release',
  'create',
  tag,
  ...files,
  '--repo',
  repo,
  '--target',
  sha,
  '--title',
  `Battly Overlay ${version}`,
  '--notes-file',
  'RELEASE-NOTES.md',
  '--draft',
]);
gh(['release', 'edit', tag, '--repo', repo, '--draft=false']);
