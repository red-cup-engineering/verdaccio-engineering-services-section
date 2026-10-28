#!/usr/bin/env node
/** Read-only exact repository routing assay; existing authorized Work owns any write. */
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectRepositoryNpmrc } from '../src/npmrc-source-projection.mjs';

const args = process.argv.slice(2);
const repositoryAt = args.indexOf('--repository');
const allowed = new Set(['--repository', '--config', '--check', '--emit']);
try {
  if (repositoryAt < 0 || !args[repositoryAt + 1] || !isAbsolute(args[repositoryAt + 1]) ||
      args.some(x => x.startsWith('--') && !allowed.has(x)) ||
      args.includes('--check') === args.includes('--emit'))
    throw new TypeError('expected --repository /absolute/source --check|--emit [--config /absolute/verdaccio.yaml]');
  const configAt = args.indexOf('--config');
  if (configAt >= 0 && (!args[configAt+1] || !isAbsolute(args[configAt+1])))
    throw new TypeError('Verdaccio source configuration must be an absolute path');
  const root = realpathSync(args[repositoryAt+1]), npmrc = join(root,'.npmrc');
  const original = lstatSync(npmrc);
  if (!original.isFile() || original.size > 65_536 || realpathSync(npmrc) !== npmrc)
    throw new TypeError('source npmrc must be a bounded regular file, not a symlink');
  const config = configAt < 0
    ? fileURLToPath(new URL('../content/config/cold-red-gate.yaml', import.meta.url))
    : resolve(args[configAt+1]);
  const cfgstat = lstatSync(config);
  if (!cfgstat.isFile() || cfgstat.size > 65_536 || realpathSync(config) !== config)
    throw new TypeError('selected registry configuration must be a bounded original source file');
  const result = projectRepositoryNpmrc({
    source: readFileSync(npmrc,'utf8'), configuration: readFileSync(config,'utf8')
  });
  if (args.includes('--emit')) process.stdout.write(result.content);
  else if (result.changed) {
    process.stderr.write('Repository npmrc differs from canonical private-scope routing; receive --emit through original source-workspace Work.\n');
    process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write('Repository registry source admission refused: ' + error.message + '\n');
  process.exitCode = 2;
}
