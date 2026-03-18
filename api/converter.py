from http.server import BaseHTTPRequestHandler
import pandas as pd
import io
import cgi
import re

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # 1. Configura la ricezione del file
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST'}
            )
            
            if 'excel' not in form:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Errore: Nessun file Excel ricevuto")
                return

            # 2. Leggi il contenuto binario
            file_data = form['excel'].file.read()
            
            # 3. Carica l'Excel (supporta .xlsx e .xls)
            # Usiamo engine='openpyxl' perché è il più robusto per file moderni
            try:
                df = pd.read_excel(io.BytesIO(file_data), engine='openpyxl', header=None)
            except Exception as e:
                # Se fallisce, prova il caricamento standard (per vecchi .xls)
                df = pd.read_excel(io.BytesIO(file_data), header=None)
            
            numbers = set()

            # 4. DEEP SCAN: Analizza ogni singola cella del file
            for row in df.values:
                for cell in row:
                    val_str = str(cell).strip()
                    if not val_str or val_str == 'nan':
                        continue
                    
                    # Estraiamo solo le cifre
                    clean_val = "".join(filter(str.isdigit, val_str))
                    
                    # Logica RPO: Rimuovi prefissi internazionali se presenti
                    # Se inizia con 0039 (4 cifre), togliamo le prime 4
                    if clean_val.startswith('0039'):
                        clean_val = clean_val[4:]
                    # Se inizia con 39 e il resto sembra un cellulare/fisso (es. 39347...)
                    elif clean_val.startswith('39') and len(clean_val) > 10:
                        clean_val = clean_val[2:]
                    
                    # Un numero italiano valido (fisso o mobile) va da 8 a 11 cifre
                    if 8 <= len(clean_val) <= 11:
                        numbers.add(clean_val)

            # 5. Controllo se abbiamo trovato qualcosa
            if not numbers:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(b"Errore: Non ho trovato numeri validi (8-11 cifre) nell'Excel")
                return

            # 6. Formattazione Finale (PDF RPO compliant)
            # Ordinati, uno per riga, terminati con CRLF (\r\n)
            sorted_numbers = sorted(list(numbers))
            final_output = "\r\n".join(sorted_numbers) + "\r\n"

            # 7. Risposta al Frontend
            self.send_response(200)
            # Specifichiamo l'encoding US-ASCII richiesto dal manuale
            self.send_header('Content-type', 'text/plain; charset=us-ascii')
            self.send_header('Content-Disposition', 'attachment; filename="da_inviare_rpo.txt"')
            self.end_headers()
            
            # Convertiamo in ascii ignorando caratteri strani
            self.wfile.write(final_output.encode('ascii', 'ignore'))

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            error_msg = f"Errore Interno Python: {str(e)}"
            self.wfile.write(error_msg.encode())

