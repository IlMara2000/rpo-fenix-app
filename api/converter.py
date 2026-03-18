from http.server import BaseHTTPRequestHandler
import pandas as pd
import io
import cgi

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST'}
            )
            
            if 'excel' not in form:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Errore: File non ricevuto")
                return

            file_data = form['excel'].file.read()
            df = pd.read_excel(io.BytesIO(file_data), engine='openpyxl', header=None, dtype=str)
            
            numbers = set()

            for row in df.values:
                for cell in row:
                    s = str(cell).strip().lower()
                    if not s or s == 'nan' or s == 'none': continue
                    
                    # 1. Teniamo solo le cifre
                    clean_val = "".join(filter(str.isdigit, s))
                    if not clean_val: continue

                    # 2. LOGICA ANTI-ERRORE 77 (Prefissi)
                    
                    # Rimuove 0039
                    if clean_val.startswith('0039'):
                        clean_val = clean_val[4:]
                    
                    # Rimuove il 39 se il numero totale e' di 12 cifre (es. 39 347 1234567)
                    # Un cellulare italiano pulito è lungo 10 cifre. Se è 12, quel 39 è di troppo.
                    if len(clean_val) == 12 and clean_val.startswith('39'):
                        clean_val = clean_val[2:]
                    
                    # Rimuove il 39 se il numero totale e' di 11 cifre (es. 39 02 1234567)
                    if len(clean_val) == 11 and clean_val.startswith('39'):
                        clean_val = clean_val[2:]

                    # 3. Validazione finale: 
                    # L'RPO accetta solo numerazioni nazionali (8-11 cifre dopo la pulizia)
                    # e NON deve esserci traccia di prefisso internazionale.
                    if 8 <= len(clean_val) <= 11:
                        # Un'ultima verifica: se dopo la pulizia inizia ancora con 00, e' un errore
                        if not clean_val.startswith('00'):
                            numbers.add(clean_val)

            if not numbers:
                raise Exception("Nessuna numerazione valida trovata")

            # Ordinamento e terminatore CRLF obbligatorio
            final_list = sorted(list(numbers))
            final_output = "\r\n".join(final_list) + "\r\n"

            self.send_response(200)
            self.send_header('Content-type', 'text/plain; charset=us-ascii')
            self.send_header('Content-Disposition', 'attachment; filename="da_inviare.txt"')
            self.end_headers()
            
            # Invio pulito
            self.wfile.write(final_output.encode('ascii', 'ignore'))

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Errore: {str(e)}".encode())
