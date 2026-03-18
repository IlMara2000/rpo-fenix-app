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
            # Leggiamo tutto come stringa per evitare formati scientifici
            df = pd.read_excel(io.BytesIO(file_data), engine='openpyxl', header=None, dtype=str)
            
            numbers = set()

            for row in df.values:
                for cell in row:
                    s = str(cell).strip()
                    if not s or s.lower() in ['nan', 'none']: continue
                    
                    # 1. Teniamo SOLO le cifre decimali
                    clean_val = "".join(filter(str.isdigit, s))
                    if not clean_val: continue

                    # 2. RIMOZIONE PREFISSI (Regola RPO: No 0039, No prefisso nazione)
                    if clean_val.startswith('0039'):
                        clean_val = clean_val[4:]
                    elif clean_val.startswith('39') and len(clean_val) >= 11:
                        # Se tolgo 39 e rimane un numero che inizia con 3 (mobile) o 0 (fisso)
                        temp = clean_val[2:]
                        if temp.startswith('3') or temp.startswith('0'):
                            clean_val = temp

                    # 3. VALIDAZIONE RIGIDA
                    # Un numero italiano (fisso o mobile) senza prefisso va da 8 a 11 cifre.
                    # Deve iniziare con '0' (fisso) o '3' (mobile). 
                    # Se inizia con '00' dopo la pulizia, è un prefisso estero e va scartato (Error 77).
                    if 8 <= len(clean_val) <= 11:
                        if (clean_val.startswith('0') and not clean_val.startswith('00')) or clean_val.startswith('3'):
                            numbers.add(clean_val)

            if not numbers:
                raise Exception("Nessuna numerazione valida trovata")

            # 4. FORMATTAZIONE ASCII + CRLF (Regola RFC1951 / ASCII)
            # Ordine alfabetico e rimozione duplicati (grazie al set)
            sorted_list = sorted(list(numbers))
            # Usiamo \r\n per il Carriage Return + Line Feed richiesto
            final_output = "\r\n".join(sorted_list) + "\r\n"

            self.send_response(200)
            # Forziamo ASCII e nome file tutto minuscolo come richiesto
            self.send_header('Content-type', 'text/plain; charset=us-ascii')
            self.send_header('Content-Disposition', 'attachment; filename="lista.txt"')
            self.end_headers()
            
            # Scrittura in ASCII puro (scarta caratteri non compatibili)
            self.wfile.write(final_output.encode('ascii', 'ignore'))

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Errore: {str(e)}".encode())
