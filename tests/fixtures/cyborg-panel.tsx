// Fixture locale senza login, dati personali o richieste al backend.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CyborgPanel } from '../../src/censimento/CyborgPanel';
import { mergeCyborgImport, type CyborgImport } from '../../src/censimento/cyborgImport';
import '../../src/workspace.css';
function Fixture() {
  const [data, setData] = useState<{ contacts: CyborgImport['contacts']; properties: CyborgImport['properties'] }>({ contacts: [], properties: [] });
  return <main className="workspace-shell" style={{ background: '#141820', color: '#fff' }}>
    <CyborgPanel preview={batch => mergeCyborgImport(data, batch)} onImport={batch => setData(current => mergeCyborgImport(current, batch))} />
    <p role="status">Salvati: {data.contacts.length} proprietari, {data.properties.length} immobili</p>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
