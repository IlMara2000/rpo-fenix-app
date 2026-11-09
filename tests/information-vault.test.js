import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/crm/informationVault.ts', import.meta.url), 'utf8');
const code = ts.transpile(source, { module: ts.ModuleKind.ESNext });
const { sealInformationArchive, openInformationArchive, validateInformationArchive } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const archive = { format:'grfenix-information', version:1, entries:[{id:'test-1',kind:'contact',information:{name:'Contatto sintetico'},provenance:{source:'Fixture locale',collectedAt:'2026-11-07',purpose:'Test software',legalBasis:'to-review',retentionReviewAt:'2026-11-08'}}] };
const passphrase = 'passphrase solo per test';
test('encrypted portable archive round-trips; random salt and nonce; no names in envelope', async () => {
  const first = await sealInformationArchive(archive,passphrase);
  const second = await sealInformationArchive(archive,passphrase);
  assert.notEqual(first,second);
  assert.doesNotMatch(first,/Contatto sintetico|Fixture locale/);
  assert.deepEqual(await openInformationArchive(first,passphrase),archive);
  await assert.rejects(openInformationArchive(first,'passphrase diversa'),/errata/);
  const tampered = JSON.parse(first);
  tampered.ciphertext = (tampered.ciphertext[0] === 'A' ? 'B' : 'A') + tampered.ciphertext.slice(1);
  await assert.rejects(openInformationArchive(JSON.stringify(tampered),passphrase),/modificato/);
});
test('rejects missing provenance, duplicates, short passphrases and attacker-controlled KDF cost',async()=>{
  assert.throws(()=>validateInformationArchive({...archive,entries:[{...archive.entries[0],provenance:null}]}));
  assert.throws(()=>validateInformationArchive({...archive,entries:[archive.entries[0],archive.entries[0]]}));
  await assert.rejects(sealInformationArchive(archive,'short'));
  const file = JSON.parse(await sealInformationArchive(archive,passphrase));
  file.iterations = 999999999;
  await assert.rejects(openInformationArchive(JSON.stringify(file),passphrase),/non supportato/);
});
