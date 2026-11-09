export type CyborgRecord = Record<string, unknown>;
const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const norm = (value: unknown) => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ');
const cat = (value: unknown) => norm(value).replace(/^0+(?=\d)/, '');

export function validateCyborgRecords(value: unknown): CyborgRecord[] {
  if (!Array.isArray(value) || !value.length || value.length > 50000) throw new Error('Il DB deve contenere da 1 a 50.000 record.');
  if (JSON.stringify(value).length > 20 * 1024 * 1024) throw new Error('DB troppo grande: importa una sessione più piccola.');
  if (value.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('Formato dei record non valido.');
  return value;
}

function propertyKey(row: { sheet?: string; parcel?: string; subaltern?: string; title?: string; zone?: string; details?: { realStreet?: string } }) {
  // Senza subalterno non possiamo assumere che due unita' siano lo stesso immobile.
  return row.sheet && row.parcel && row.subaltern
    ? JSON.stringify([cat(row.sheet), cat(row.parcel), cat(row.subaltern), norm(row.zone), norm(row.details?.realStreet || row.title)])
    : '';
}
function contactKey(row: { taxCode?: string; name: string; sheet?: string; parcel?: string; subaltern?: string; property?: string }) {
  const identity = norm(row.taxCode) || norm(row.name);
  return JSON.stringify([identity, cat(row.sheet), cat(row.parcel), cat(row.subaltern),
    norm(row.property).split(" — F:")[0]]);
}

export function prepareCyborgImport(input: unknown, stamp = new Date().toISOString()) {
  const records = validateCyborgRecords(input);
  const contacts = [];
  const properties = [];
  let skipped = 0;
  for (const record of records) {
    const name = text(record.prop) || [text(record.cognome), text(record.nome)].filter(Boolean).join(' ');
    const sheet = text(record.f), parcel = text(record.p), subaltern = text(record.s);
    const address = text(record.ind);
    const zone = text(record.zona || record.zonaCens);
    const isOwner = norm(record.type) !== 'IMM' && Boolean(name);
    if (!isOwner && !(sheet && parcel) && !address) { skipped++; continue; }
    const title = `${address || 'Immobile censito'} — F:${sheet || '-'} P:${parcel || '-'} S:${subaltern || '-'}`;
    const property = {
      id: '', code: `CENS-${sheet || 'ND'}-${parcel || 'ND'}-${subaltern || 'ND'}`, title, zone,
      status: 'Censito', price: '', owner: isOwner ? name : '', portals: '', kind: 'vendita' as const,
      phone: text(record.telefono), taxCode: text(record.cf), sheet, parcel, subaltern,
      cadastralCategory: text(record.cat), rooms: text(record.cons), source: 'Censimento', updatedAt: stamp,
      details: { realStreet: address, cyborgOriginalRecord: JSON.stringify(record) }
    };
    const key = propertyKey(property);
    // ID stabile anche per dati incompleti: stesso record reimportato resta lo stesso.
    property.id = `cyborg-property-${encodeURIComponent(key || JSON.stringify([address, zone, sheet, parcel, subaltern, name]))}`;
    if (sheet && parcel) properties.push(property);
    if (isOwner) contacts.push({
      id: `cyborg-contact-${encodeURIComponent(contactKey({ name, taxCode: text(record.cf), sheet, parcel, subaltern, property: sheet && parcel ? title : "" }))}`,
      name, firstName: text(record.nome), lastName: text(record.cognome), type: sheet && parcel ? 'Intestatario da verificare' : 'Contatto da verificare',
      status: 'Da verificare', source: 'Censimento', owner: '', phone: text(record.telefono),
      email: text(record.email), taxCode: text(record.cf), sheet, parcel, subaltern,
      cadastralCategory: text(record.cat), rooms: text(record.cons), property: sheet && parcel ? title : "",
      note: [text(record.usu), text(record.note), text(record.nascita)].filter(Boolean).join('\n'),
      nextStep: '', updatedAt: stamp,
      details: { censusArea: zone, sourceAddress: address, office: "Montenero", officeAddress: "Via Bergamo 11, Milano", operatingArea: "Porta Romana, Milano", verificationStatus: "Da verificare", birthDate: text(record.nascita), cyborgOriginalRecord: JSON.stringify(record) }
    });
  }
  return { contacts, properties, skipped, recordCount: records.length };
}

export type CyborgImport = ReturnType<typeof prepareCyborgImport>;
export function mergeCyborgImport<
  C extends { id: string; name: string; taxCode?: string; sheet?: string; parcel?: string; subaltern?: string; property?: string },
  P extends { id: string; sheet?: string; parcel?: string; subaltern?: string; title?: string; zone?: string }
>(current: { contacts: C[]; properties: P[] }, batch: CyborgImport) {
  const contactIds = new Set(current.contacts.map(row => row.id));
  const contactKeys = new Set(current.contacts.map(contactKey));
  const propertyIds = new Set(current.properties.map(row => row.id));
  const propertyKeys = new Set(current.properties.map(propertyKey).filter(Boolean));
  const addedContacts = batch.contacts.filter(row => {
    const key = contactKey(row);
    if (contactIds.has(row.id) || contactKeys.has(key)) return false;
    contactIds.add(row.id); contactKeys.add(key); return true;
  });
  const addedProperties = batch.properties.filter(row => {
    const key = propertyKey(row);
    if (propertyIds.has(row.id) || (key && propertyKeys.has(key))) return false;
    propertyIds.add(row.id); if (key) propertyKeys.add(key); return true;
  });
  return {
    contacts: [...current.contacts, ...addedContacts], properties: [...current.properties, ...addedProperties],
    addedContacts: addedContacts.length, addedProperties: addedProperties.length,
    skipped: batch.skipped,
    duplicates: batch.contacts.length + batch.properties.length - addedContacts.length - addedProperties.length
  };
}

export function cyborgPanelUrl(value: unknown, parentOrigin: string): string | null {
  if (typeof value !== 'string' || !/^chrome-extension:\/\/[a-p]{32}\/popup\.html$/.test(value)) return null;
  return `${value}?parentOrigin=${encodeURIComponent(parentOrigin)}`;
}
