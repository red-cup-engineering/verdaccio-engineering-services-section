import assert from 'node:assert/strict';
import test from 'node:test';
import { houseScopesFromVerdaccio, projectRepositoryNpmrc } from '../src/npmrc-source-projection.mjs';
const configuration = "packages:\n  '@561-group/*': &private_packages\n  '@lenticule-science/*': *private_packages\n  '@foundry-rs/*':\n    access: $all\n    proxy: npmjs\n  '@red-cup-engineering/*': *private_packages\n  '**':\n    proxy: npmjs\n";

test('source-owned aliases distinguish private house scopes from publicly proxied families', () => {
  assert.deepEqual(houseScopesFromVerdaccio(configuration),
    ['@561-group','@lenticule-science','@red-cup-engineering']);
});

test('reproject unscoped house default once; repeat is content identity', () => {
  const original = 'registry=https://registry.561.group/\n';
  const first = projectRepositoryNpmrc({ source: original, configuration });
  assert.equal(first.changed,true);
  assert.match(first.content,/^registry=https:\/\/registry.npmjs.org\/$/m);
  assert.match(first.content,/^@red-cup-engineering:registry=https:\/\/registry.561.group\/$/m);
  assert.match(first.content,/^@lenticule-science:registry=https:\/\/registry.561.group\/$/m);
  assert.equal(first.content.includes('@foundry-rs:registry='),false);
  const second = projectRepositoryNpmrc({ source:first.content, configuration });
  assert.equal(second.changed,false);
  assert.equal(second.content,first.content);
});

test('unrelated declarations persist and duplicate private aliases coalesce', () => {
  const original = 'save-exact=true\n@red-cup-engineering:registry=https://registry.561.group/\n@red-cup-engineering:registry=https://registry.npmjs.org/\n@foundry-rs:registry=https://registry.561.group/\nregistry=https://registry.561.group/\n';
  const result = projectRepositoryNpmrc({ source:original, configuration });
  assert.match(result.content,/^save-exact=true$/m);
  assert.equal(result.content.split('@red-cup-engineering:registry=').length-1,1);
  assert.doesNotMatch(result.content,/^@foundry-rs:registry=/m);
});

test('unqualified alternate default and credentials refuse', () => {
  assert.throws(() => projectRepositoryNpmrc({source:'registry=https://unqualified.example/\n',configuration}), /unknown default/);
  assert.throws(() => projectRepositoryNpmrc({source:'//registry.561.group/:_authToken=SECRET\n',configuration}), /no credentials/);
  assert.throws(() => houseScopesFromVerdaccio('packages:\n'), /absent/);
});
