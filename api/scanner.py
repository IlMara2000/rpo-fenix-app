from http.server import BaseHTTPRequestHandler
import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import PatternFill, Font
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
            file_txt = form['txt'].file.read().decode('utf-8')

            # --- ESTRAZIONE PULITA DELLA BLACKLIST ---
            # Cerchiamo solo sequenze di almeno 9-10 cifre all'inizio della riga
            blacklist = set()
            for line in file_txt.splitlines():
                match = re.search(r'^(\d{9,10})', line.strip())
                if match:
                    blacklist.add(match.group(1))

            if not blacklist:
                raise ValueError("Nessun numero di telefono valido trovato nel file TXT.")

            wb = load_workbook(io.BytesIO(file_excel))
            ws = wb.active
            
            black_fill = PatternFill(start_color='000000', end_color='000000', fill_type='solid')
            white_font = Font(color='000000') # Testo nero su fondo nero (invisibile)

            matches_count = 0
            
            # Iteriamo le righe dell'Excel
            for row in ws.iter_rows(min_row=1):
                found_in_blacklist = False
                for cell in row:
                    if cell.value:
                        # Puliamo il valore della cella: teniamo solo le cifre
                        val_pulito = "".join(filter(str.isdigit, str(cell.value)))
                        
                        # Se il numero inizia con 39 (prefisso Italia) e ha 12 cifre, togliamo il 39
                        if val_pulito.startswith('39') and len(val_pulito) > 10:
                            val_pulito = val_pulito[2:]
                        
                        if val_pulito in blacklist:
                            found_in_blacklist = True
                            break
                
                if found_in_blacklist:
                    matches_count += 1
                    for cell in row:
                        cell.fill = black_fill
                        cell.font = white_font

            out = io.BytesIO()
            wb.save(out)
            out.seek(0)

            self.send_response(200)
            self.send_header('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            self.send_header('X-Matches', str(matches_count))
            self.end_headers()
            self.wfile.write(out.read())

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Errore: {str(e)}".encode())
