from http.server import BaseHTTPRequestHandler
import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import PatternFill, Font
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
            
            file_excel = form['excel'].file.read()
            file_txt = form['txt'].file.read().decode('utf-8')

            # --- FILTRO DI SICUREZZA ESTREMO ---
            # Prendiamo solo stringhe che hanno almeno 9 cifre (un numero di tel vero)
            # Puliamo tutto ciò che non è un numero
            rpo_set = set()
            for line in file_txt.splitlines():
                clean_num = "".join(filter(str.isdigit, line))
                if clean_num.startswith('39') and len(clean_num) > 10:
                    clean_num = clean_num[2:]
                
                # SE IL NUMERO NEL TXT È TROPPO CORTO (es. riga vuota o "0"), LO IGNORIAMO
                if len(clean_num) >= 9: 
                    rpo_set.add(clean_num)

            # Se per assurdo il set è vuoto, fermiamo tutto per non rovinare l'excel
            if not rpo_set:
                raise ValueError("Il file TXT non contiene numeri validi (minimo 9 cifre)")

            wb = load_workbook(io.BytesIO(file_excel))
            ws = wb.active
            
            black_fill = PatternFill(start_color='000000', end_color='000000', fill_type='solid')
            white_font = Font(color='000000') # Testo nero su fondo nero

            matches = 0
            for row in ws.iter_rows(min_row=1):
                should_black = False
                for cell in row:
                    if cell.value:
                        # Pulizia valore cella excel
                        val = "".join(filter(str.isdigit, str(cell.value)))
                        if val.startswith('39') and len(val) > 10: 
                            val = val[2:]
                        
                        # Confronto secco e sicuro
                        if len(val) >= 9 and val in rpo_set:
                            should_black = True
                            break
                
                if should_black:
                    matches += 1
                    # Anneriamo solo le prime 20 colonne per non appesantire il file
                    for i in range(min(len(row), 20)):
                        row[i].fill = black_fill
                        row[i].font = white_font

            out = io.BytesIO()
            wb.save(out)
            out.seek(0)

            self.send_response(200)
            self.send_header('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            self.send_header('X-Matches', str(matches))
            self.end_headers()
            self.wfile.write(out.read())

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())
