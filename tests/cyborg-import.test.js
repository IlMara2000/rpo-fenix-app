import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/censimento/cyborgImport.ts', import.meta.url), 'utf8');
const code = ts.transpile(source, { module: ts.ModuleKind.ESNext });
const { prepareCyborgImport, mergeCyborgImport, cyborgPanelUrl } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('preserves original records and imports co-owners as separate contacts on one property', () => {
  const records = [{ prop: 'ROSSI MARIO', f: '01', p: '2', s: '3', ind: 'Via Test 1', extra: 'originale' },
    { prop: 'BIANCHI ANNA', f: '1', p: '2', s: '3', ind: 'Via Test 1' }];
  const batch = prepareCyborgImport(records);
  const result = mergeCyborgImport({ contacts: [], properties: [] }, batch);
  assert.equal(result.addedContacts, 2);
  assert.equal(result.addedProperties, 1);
  assert.deepEqual(JSON.parse(result.contacts[0].details.cyborgOriginalRecord), records[0]);
  const repeated = mergeCyborgImport(result, batch);
  assert.equal(repeated.addedContacts, 0);
  assert.equal(repeated.addedProperties, 0);
});
test('keeps existing records unchanged and does not merge different subalterns', () => {
  const batch = prepareCyborgImport([1, 2].map(s => ({ prop: 'ROSSI MARIO', f: '1', p: '2', s })));
  const existing = { ...batch.contacts[0], id: 'manual', note: 'Conservare' };
  const result = mergeCyborgImport({ contacts: [existing], properties: [] }, batch);
  assert.equal(result.contacts[0], existing);
  assert.equal(result.addedContacts, 1);
  assert.equal(result.addedProperties, 2);
});
test('incomplete cadastral data does not merge owners into one unit; rejects malformed DB', () => {
  const result = mergeCyborgImport({ contacts: [], properties: [] }, prepareCyborgImport([
    { prop: 'ROSSI MARIO', f: '1', p: '2' }, { prop: 'VERDI ANNA', f: '1', p: '2' }, {}, { type: 'IMM', ind: 'Via Test' }
  ]));
  assert.equal(result.addedContacts, 2);
  assert.equal(result.addedProperties, 2);
  assert.equal(result.skipped, 1);
  for (const invalid of [null, {}, [], [null], [2], ['x']]) assert.throws(() => prepareCyborgImport(invalid));
});
test('panel URLs accept only the exact extension page', () => {
  const valid = `chrome-extension://${'a'.repeat(32)}/popup.html`;
  assert.equal(cyborgPanelUrl(valid, 'https://grfenix.vercel.app'), valid + '?parentOrigin=https%3A%2F%2Fgrfenix.vercel.app');
  for (const invalid of ['https://example.com/popup.html', valid + '?x=1', 'javascript:alert(1)', valid.replace('popup', 'other')]) {
    assert.equal(cyborgPanelUrl(invalid, 'https://grfenix.vercel.app'), null);
  }
});

test('a contact address alone is not turned into owned property or assigned to Porta Romana', () => {
  const batch = prepareCyborgImport([{prop:'CONTATTO TEST',ind:'Via di prova 8'}]);
  assert.equal(batch.properties.length,0);
  assert.equal(batch.contacts[0].type,'Contatto da verificare');
  assert.equal(batch.contacts[0].property,'');
  assert.equal(batch.contacts[0].details.censusArea,'');
  assert.equal(batch.contacts[0].details.office,'Montenero');
});
