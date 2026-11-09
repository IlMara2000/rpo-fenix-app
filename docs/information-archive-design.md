# Archivio informazioni CRM: prima base tecnica

## Stato

Creato `src/crm/informationVault.ts`: formato di archivio con fonte, finalità, data di raccolta, base giuridica dichiarata (anche «da verificare») e data di revisione. Esportazione/apertura di file cifrati con Web Crypto AES-256-GCM e chiave derivata dalla passphrase tramite PBKDF2-SHA256 (600.000 iterazioni). Salt e IV casuali per ogni esportazione, chiavi non esportabili. Il modulo non legge storage, non salva passphrase e non effettua chiamate di rete.

Questa è una base testata, non una migrazione del CRM. Il salvataggio corrente resta invariato. Nessun dato reale è stato raccolto, migrato o pubblicato. La passphrase non è recuperabile dal modulo: per l'interfaccia finale occorrono istruzioni di custodia e backup. Quando aperti, i dati sono in memoria e accessibili al codice della pagina; la cifratura del file non protegge una pagina compromessa.

## Decisioni ancora necessarie

- Quali informazioni conservare e con quali fonti/documentazione di liceità.
- Uso per clienti esistenti o acquisizione di nuovi contatti e relativi canali.
- Archivio personale locale oppure condiviso tra operatori/agenzie.
- Tempi di conservazione, autorizzazioni, rettifica, opposizioni, cancellazione e backup.

Nessun flag del software costituisce una validazione legale. La base giuridica deve essere documentata per il trattamento concreto. Le operazioni commerciali richiedono una valutazione separata; il solo fatto che un dato sia pubblico o cifrato non autorizza il suo uso promozionale.

## Fonti consultate il 7 novembre 2026

- Commissione europea: il GDPR è neutrale rispetto alla tecnologia, include raccolta, organizzazione e conservazione: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en
- Principi di finalità, minimizzazione, conservazione e sicurezza: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en
- Dati ricevuti da terzi per marketing: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/can-data-received-third-party-be-used-marketing_it
- Web Crypto deriveKey: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey
- Parametri PBKDF2: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

Non esiste una modalità alternativa universalmente legale usata da tutti i CRM. Un database può essere utilizzato lecitamente; un file locale può essere utilizzato illecitamente. L'architettura riduce rischi e accessi, non sostituisce la verifica giuridica.
