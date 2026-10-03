import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = new URL('../', import.meta.url);
const bytes = await readFile(new URL('diagnostics.json', root), 'utf8');
const catalog = JSON.parse(bytes);
const spec = await readFile(new URL('spec.emu', root), 'utf8') + await readFile(new URL('checking.emu', root), 'utf8');
if (catalog.schemaVersion !== 1) throw new Error('Unsupported diagnostic schema version');
const codes = new Set();
const rules = new Set();
for (const item of catalog.diagnostics) {
  if (!/^RT_[A-Z_]+$/.test(item.code)) throw new Error(`Invalid code: ${item.code}`);
  if (!/^rt-[a-z-]+$/.test(item.rule) || rules.has(item.rule)) throw new Error(`Invalid or duplicate rule: ${item.rule}`);
  if (!['always', 'checked'].includes(item.applicability)) throw new Error(`Missing applicability: ${item.code}`);
  if (!['provisional', 'stable', 'retired'].includes(item.status)) throw new Error(`Invalid lifecycle: ${item.code}`);
  if (item.errorClass !== 'StaticTypeError' || !item.explanation) throw new Error(`Invalid diagnostic: ${item.code}`);
  if (!Array.isArray(item.phases) || !item.phases.length
      || item.phases.some((phase) => !['static', 'pre-evaluation'].includes(phase))) throw new Error(`Invalid phases: ${item.rule}`);
  if (item.arguments?.type !== 'array' || item.arguments.items?.type !== 'string') throw new Error(`Invalid argument schema: ${item.rule}`);
  if (!Array.isArray(item.relatedLocations) || item.relatedLocations.some((role) => !['declaration', 'origin'].includes(role))) throw new Error(`Invalid location schema: ${item.rule}`);
  if (!Array.isArray(item.specification) || !item.specification.length) throw new Error(`Missing normative source: ${item.rule}`);
  for (const section of item.specification) {
    if (!spec.includes(`id="${section}"`)) throw new Error(`Dangling section: ${section}`);
  }
  codes.add(item.code);
  rules.add(item.rule);
}
const sha256 = createHash('sha256').update(bytes).digest('hex');
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const index = '<!-- Generated from diagnostics.json. -->\n<emu-clause id="sec-diagnostic-registry">\n'
  + '  <h1>Diagnostic Rule Index</h1>\n'
  + '  <p>This informative index identifies rule families and links to their normative clauses. It does not define an additional rejection predicate. Provisional identifiers may be refined; stable and retired identifiers are never repurposed.</p>\n'
  + '  <emu-table><emu-caption>Diagnostic rule identities</emu-caption><table>\n'
  + '    <thead><tr><th>Rule</th><th>Diagnostic family</th><th>Applicability</th><th>Meaning and normative source</th></tr></thead>\n    <tbody>\n'
  + catalog.diagnostics.map((item) => `      <tr><td><dfn id="${item.rule}">${item.rule}</dfn></td><td><code>${item.code}</code> (${item.status})</td><td>${item.applicability === 'checked' ? 'Checked code' : 'Everywhere'}</td><td>${escape(item.explanation)} ${item.specification.map((id) => `<emu-xref href="#${id}"></emu-xref>`).join(', ')}</td></tr>`).join('\n')
  + '\n    </tbody>\n  </table></emu-table>\n</emu-clause>\n';
const output = process.argv[2];
if (output) {
  const destination = resolve(output);
  await mkdir(destination, {recursive:true});
  await writeFile(resolve(destination, 'diagnostic-catalog.mts'),
    `// Generated from proposal-runtime-types/diagnostics.json.\n// Catalog SHA-256: ${sha256}\n`
    + `export const TypeDiagnosticCatalog = ${JSON.stringify(catalog.diagnostics, null, 2)} as const;\n`
    + `export type TypeDiagnosticCode = typeof TypeDiagnosticCatalog[number]['code'];\n`
    + `export type TypeDiagnosticRule = typeof TypeDiagnosticCatalog[number]['rule'];\n`
    + `export const TypeDiagnosticCatalogHash = '${sha256}';\n`);
  await writeFile(new URL('diagnostics.emu', root), index);
} else {
  if (await readFile(new URL('diagnostics.emu', root), 'utf8') !== index) throw new Error('Diagnostic index is stale; regenerate it with the engine catalog.');
}
console.log(`Validated ${codes.size} diagnostic families (${sha256}).`);
