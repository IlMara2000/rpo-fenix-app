/** File cifrato portabile. Non legge/scrive storage e non effettua richieste di rete. */
export interface InformationEntry {
  id: string;
  kind: 'contact' | 'property' | 'note';
  information: Record<string, string>;
  provenance: {
    source: string;
    collectedAt: string;
    purpose: string;
    legalBasis: 'to-review' | 'consent' | 'contract' | 'legal-obligation' | 'legitimate-interest';
    retentionReviewAt: string;
  };
}
export interface InformationArchive {
  format: 'grfenix-information';
  version: 1;
  entries: InformationEntry[];
}
const FORMAT = 'grfenix-encrypted-information';
const ITERATIONS = 600000;
const MAX_BYTES = 10 * 1024 * 1024;
const encoder = new TextEncoder();
const additionalData = encoder.encode(`${FORMAT}:1`);

export function validateInformationArchive(value: unknown): InformationArchive {
  if (!value || typeof value !== 'object') throw new Error('Archivio non valido.');
  const archive = value as InformationArchive;
  if (archive.format !== 'grfenix-information' || archive.version !== 1 || !Array.isArray(archive.entries) || archive.entries.length > 50000) throw new Error('Formato archivio non supportato.');
  const ids = new Set<string>();
  for (const entry of archive.entries) {
    const provenance = entry?.provenance;
    if (!entry || typeof entry.id !== 'string' || !entry.id.trim() || ids.has(entry.id) ||
      !['contact', 'property', 'note'].includes(entry.kind) || !entry.information || typeof entry.information !== 'object' || Array.isArray(entry.information) ||
      Object.values(entry.information).some(item => typeof item !== 'string') || !provenance ||
      typeof provenance.source !== 'string' || !provenance.source.trim() || typeof provenance.purpose !== 'string' || !provenance.purpose.trim() ||
      !['to-review', 'consent', 'contract', 'legal-obligation', 'legitimate-interest'].includes(provenance.legalBasis) ||
      !Number.isFinite(Date.parse(provenance.collectedAt)) || !Number.isFinite(Date.parse(provenance.retentionReviewAt))) {
      throw new Error('Record non valido: servono identità, fonte, finalità e date di verifica.');
    }
    ids.add(entry.id);
  }
  return archive;
}

function base64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
function unbase64(value: unknown): Uint8Array<ArrayBuffer> {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('File cifrato non valido.');
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}
async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>) {
  if (typeof passphrase !== 'string' || passphrase.length < 12 || passphrase.length > 1024) throw new Error('Usa una passphrase da 12 a 1024 caratteri.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt }, material,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function sealInformationArchive(archive: InformationArchive, passphrase: string): Promise<string> {
  const plaintext = encoder.encode(JSON.stringify(validateInformationArchive(archive)));
  if (plaintext.byteLength > MAX_BYTES) throw new Error('Archivio oltre il limite di 10 MB.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData, tagLength: 128 }, key, plaintext);
  return JSON.stringify({ format: FORMAT, version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS,
    cipher: 'AES-256-GCM', salt: base64(salt), iv: base64(iv), ciphertext: base64(new Uint8Array(ciphertext)) });
}

export async function openInformationArchive(file: string, passphrase: string): Promise<InformationArchive> {
  if (typeof file !== 'string' || file.length > Math.ceil((MAX_BYTES + 16) * 4 / 3) + 1024) throw new Error('File archivio troppo grande.');
  const envelope = JSON.parse(file);
  if (!envelope || envelope.format !== FORMAT || envelope.version !== 1 || envelope.kdf !== 'PBKDF2-SHA256' ||
    envelope.iterations !== ITERATIONS || envelope.cipher !== 'AES-256-GCM') throw new Error('Formato cifrato non supportato.');
  const salt = unbase64(envelope.salt), iv = unbase64(envelope.iv), ciphertext = unbase64(envelope.ciphertext);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > MAX_BYTES + 16) throw new Error('File cifrato non valido.');
  const key = await deriveKey(passphrase, salt);
  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData, tagLength: 128 }, key, ciphertext);
  } catch {
    throw new Error('Passphrase errata o archivio modificato.');
  }
  return validateInformationArchive(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext)));
}
