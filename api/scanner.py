from http.server import BaseHTTPRequestHandler
import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import PatternFill, Font
import io
import cgi

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1. Recupera i file inviati dal frontend
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={'REQUEST_METHOD': 'POST'}
        )
        
        file_excel = form['excel'].file.read()
        file_txt = form['txt'].file.read().decode('utf-8')

        # 2. Crea la blacklist dei numeri
        rpo_set = {line.strip().replace(" ", "").replace("+39", "") 
                   for line in file_txt.splitlines() if len(line.strip()) > 6}

        # 3. Elabora l'Excel
        wb = load_workbook(io.BytesIO(file_excel))
        ws = wb.active
        black_fill = PatternFill(start_color='000000', end_color='000000', fill_type='solid')
        
        matches = 0
        for row in ws.iter_rows(min_row=1):
            should_black = False
            for cell in row:
                if cell.value:
                    val = "".join(filter(str.isdigit, str(cell.value)))
                    if val.startswith('39') and len(val) > 10: val = val[2:]
                    if val in rpo_set:
                        should_black = True
                        break
            
            if should_black:
                matches += 1
                for cell in row:
                    cell.fill = black_fill
                    cell.font = Font(color='000000')

        # 4. Rispondi inviando il file elaborato
        out = io.BytesIO()
        wb.save(out)
        out.seek(0)

        self.send_response(200)
        self.send_header('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        self.send_header('Content-Disposition', 'attachment; filename="bonificato.xlsx"')
        self.send_header('X-Matches', str(matches))
        self.end_headers()
        self.wfile.write(out.read())
