import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('../scripts/check-repository-npmrc.mjs', import.meta.url));
const configuration = "packages:\n  '@561-group/*': &private_packages\n  '@red-cup-engineering/*': *private_packages\n  '@foundry-rs/*':\n    access: $all\n    proxy: npmjs\n";
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(),'npmrc-source-'));
  t.after(() => rmSync(root,{recursive:true,force:true}));
  const config = join(root,'registry.yaml');
  writeFileSync(config,configuration);
  return {root,config};
}
const run = (root,config,mode) => spawnSync(process.execPath,
  [script,'--repository',root,'--config',config,mode],{encoding:'utf8'});

test('native read-only source receiver emits exact repair and admits applied source', t => {
  const {root,config}=fixture(t), file=join(root,'.npmrc');
  writeFileSync(file,'registry=https://registry.561.group/\n');
  assert.equal(run(root,config,'--check').status,1);
  const projected=run(root,config,'--emit');
  assert.equal(projected.status,0,projected.stderr);
  assert.match(projected.stdout,/^registry=https:\/\/registry.npmjs.org\/$/m);
  assert.match(projected.stdout,/^@red-cup-engineering:registry=https:\/\/registry.561.group\/$/m);
  assert.equal(run(root,config,'--check').status,1,'no automatic source write');
  writeFileSync(file,projected.stdout);
  assert.equal(run(root,config,'--check').status,0);
});

test('credential source and non-absolute repository refuse without disclosure', t => {
  const {root,config}=fixture(t);
  writeFileSync(join(root,'.npmrc'),'//registry.561.group/:_authToken=SENSITIVE\n');
  const refused=run(root,config,'--emit');
  assert.equal(refused.status,2);
  assert.equal(refused.stdout,'');
  assert.doesNotMatch(refused.stderr,/SENSITIVE/);
  assert.equal(run('relative',config,'--check').status,2);
});
