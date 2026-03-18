from http.server import BaseHTTPRequestHandler
import pandas as pd
import io
import cgi
import zipfile

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
                    s = str(cell).strip()
                    if not s or s.lower() in ['nan', 'none']: continue
                    
                    clean_val = "".join(filter(str.isdigit, s))
                    if not clean_val: continue

                    if clean_val.startswith('0039'):
                        clean_val = clean_val[4:]
                    elif clean_val.startswith('39') and len(clean_val) >= 11:
                        temp = clean_val[2:]
                        if temp.startswith('3') or temp.startswith('0'):
                            clean_val = temp

                    if 8 <= len(clean_val) <= 11:
                        if (clean_val.startswith('0') and not clean_val.startswith('00')) or clean_val.startswith('3'):
                            numbers.add(clean_val)

            if not numbers:
                raise Exception("Nessuna numerazione valida trovata")

            sorted_list = sorted(list(numbers))
            
            # Formattazione con sequenza CRLF (\r\n)
            final_output = "\r\n".join(sorted_list) + "\r\n"

            # --- CREAZIONE ARCHIVIO ZIP IN MEMORIA ---
            zip_buffer = io.BytesIO()
            
            # Usiamo zipfile.ZIP_DEFLATED che è esattamente l'algoritmo deflate (IETF RFC1951)
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Inseriamo il file 'lista.txt' codificato in UTF-8 all'interno dello zip
                zip_file.writestr('lista.txt', final_output.encode('utf-8'))

            zip_buffer.seek(0)

            # Restituiamo lo ZIP al frontend
            self.send_response(200)
            self.send_header('Content-type', 'application/zip')
            self.send_header('Content-Disposition', 'attachment; filename="lista.zip"')
            self.end_headers()
            
            self.wfile.write(zip_buffer.read())

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Errore: {str(e)}".encode())
