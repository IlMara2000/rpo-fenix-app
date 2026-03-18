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
                raise Exception("File Excel non ricevuto dal server")

            file_excel = form['excel'].file.read()
            
            # Leggiamo l'excel ignorando errori di formattazione
            # engine='openpyxl' è il più affidabile per i nuovi .xlsx
            try:
                df = pd.read_excel(io.BytesIO(file_excel), engine='openpyxl')
            except:
                # Se fallisce, prova il vecchio formato .xls
                df = pd.read_excel(io.BytesIO(file_excel))
            
            numbers = set()
            
            # Trasformiamo tutto il contenuto dell'excel in una lista gigante di stringhe
            all_values = df.astype(str).values.flatten()
            
            for val in all_values:
                # Estraiamo solo i numeri
                clean_val = "".join(filter(str.isdigit, val))
                
                # Pulizia prefissi come da PDF RPO
                if clean_val.startswith('0039'): clean_val = clean_val[4:]
                elif clean_val.startswith('39') and len(clean_val) > 10: clean_val = clean_val[2:]
                
                # Lunghezza minima 8 (fisso) massima 11 (mobile)
                if 8 <= len(clean_val) <= 11:
                    numbers.add(clean_val)

            if not numbers:
                raise Exception("Nessun numero trovato nelle celle dell'Excel")

            # Ordinamento e separazione CRLF (richiesto da RPO)
            final_txt = "\r\n".join(sorted(list(numbers))) + "\r\n"

            self.send_response(200)
            self.send_header('Content-type', 'text/plain;charset=us-ascii')
            self.send_header('Content-Disposition', 'attachment; filename="rpo_pronto.txt"')
            self.end_headers()
            self.wfile.write(final_txt.encode('ascii', 'ignore'))

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Errore Server Python: {str(e)}".encode())
