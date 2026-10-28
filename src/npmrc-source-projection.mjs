/** Pure original Verdaccio source-policy projection. Public npm remains npmjs. */
export const PUBLIC_NPM_REGISTRY = 'https://registry.npmjs.org/';
export const HOUSE_NPM_REGISTRY = 'https://registry.561.group/';

/** Only original private aliases are house scopes; public proxied names are not. */
export function houseScopesFromVerdaccio(configuration) {
  if (typeof configuration !== 'string' || configuration.length > 65_536)
    throw new TypeError('bounded original Verdaccio declaration required');
  const names = [...configuration.matchAll(/^  '(@[a-z0-9._-]+)\/\*':\s*(?:&private_packages|\*private_packages)\s*$/gmu)]
    .map(match => match[1]);
  if (!names.length || names.length > 64 || new Set(names).size !== names.length)
    throw new TypeError('private registry scopes are absent or ambiguous');
  return Object.freeze(names.sort());
}

/** One original repository npmrc is a pure, repeatable normal-form calculation. */
export function projectRepositoryNpmrc({ source, configuration }) {
  if (typeof source !== 'string' || source.length > 65_536 || source.includes('\0') ||
      /(?:^|\n)\s*(?:\/\/[^\n]*:_auth(?:Token)?|_auth(?:Token)?|password)\s*=/iu.test(source))
    throw new TypeError('repository npmrc must be bounded and contain no credentials');
  const scopes = houseScopesFromVerdaccio(configuration), privateSet = new Set(scopes);
  const lines = source.replace(/\r\n/gu, '\n').split('\n');
  while (lines.length && lines.at(-1) === '') lines.pop();
  const result = [], seen = new Set();
  let defaultSeen = false;
  for (const line of lines) {
    const match = /^\s*(@[a-z0-9._-]+):registry\s*=\s*(\S+)\s*$/iu.exec(line);
    if (match) {
      const [, scope, registry] = match;
      if (privateSet.has(scope)) {
        if (!seen.has(scope)) {
          result.push(scope + ':registry=' + HOUSE_NPM_REGISTRY);
          seen.add(scope);
        }
        continue;
      }
      if (registry === HOUSE_NPM_REGISTRY) continue;
      result.push(line);
      continue;
    }
    const fallback = /^\s*registry\s*=\s*(\S+)\s*$/iu.exec(line);
    if (fallback) {
      if (![HOUSE_NPM_REGISTRY, PUBLIC_NPM_REGISTRY].includes(fallback[1]))
        throw new TypeError('unknown default npm source origin requires owner qualification');
      if (!defaultSeen) result.push('registry=' + PUBLIC_NPM_REGISTRY);
      defaultSeen = true;
      continue;
    }
    if (/^\s*(?:@[^\s=]*:registry|registry)\s*=/iu.test(line))
      throw new TypeError('incomplete repository registry routing declaration');
    result.push(line);
  }
  if (!defaultSeen) result.unshift('registry=' + PUBLIC_NPM_REGISTRY);
  for (const scope of scopes)
    if (!seen.has(scope)) result.push(scope + ':registry=' + HOUSE_NPM_REGISTRY);
  const content = result.join('\n').replace(/\n*$/u, '') + '\n';
  return Object.freeze({ kind: 'npmrc.private-scope-source-projection/v1', content,
    changed: source !== content, houseScopes: scopes,
    publicRegistry: PUBLIC_NPM_REGISTRY, privateRegistry: HOUSE_NPM_REGISTRY });
}
