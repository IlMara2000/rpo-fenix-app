from http.server import BaseHTTPRequestHandler
import pandas as pd
import io
import cgi
import re

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST'}
            )
            
            file_excel = form['excel'].file.read()
            
            # Usiamo Pandas per caricare l'excel: è 100 volte più veloce di JS
            df = pd.read_excel(io.BytesIO(file_excel), header=None)
            
            numbers = set()
            
            # Scansioniamo ogni cella del dataframe
            for column in df.columns:
                # Convertiamo tutto in stringa e puliamo
                col_data = df[column].astype(str)
                for val in col_data:
                    # Estraiamo solo le cifre
                    clean_val = "".join(filter(str.isdigit, val))
                    
                    # Togliamo il prefisso 39 o 0039 se presente
                    if clean_val.startswith('0039'): clean_val = clean_val[4:]
                    elif clean_val.startswith('39') and len(clean_val) > 10: clean_val = clean_val[2:]
                    
                    # Accettiamo solo numeri con lunghezza valida per RPO (8-11 cifre)
                    if 8 <= len(clean_val) <= 11:
                        numbers.add(clean_val)

            # Formattazione CRLF come richiesto dal manuale RPO
            final_txt = "\r\n".join(sorted(list(numbers))) + "\r\n"

            self.send_response(200)
            self.send_header('Content-type', 'text/plain;charset=us-ascii')
            self.send_header('Content-Disposition', 'attachment; filename="da_inviare_rpo.txt"')
            self.end_headers()
            self.wfile.write(final_txt.encode('ascii', 'ignore'))

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())
