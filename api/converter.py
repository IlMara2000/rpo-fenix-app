from http.server import BaseHTTPRequestHandler
import cgi
import io
import zipfile

import pandas as pd


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={"REQUEST_METHOD": "POST"},
            )

            if "excel" not in form:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Errore: File non ricevuto")
                return

            file_data = form["excel"].file.read()
            df = pd.read_excel(io.BytesIO(file_data), engine="openpyxl", header=None, dtype=str)
            numbers = set()

            for row in df.values:
                for cell in row:
                    value = str(cell).strip()
                    if not value or value.lower() in ["nan", "none"]:
                        continue

                    clean_value = "".join(filter(str.isdigit, value))
                    if not clean_value:
                        continue

                    if clean_value.startswith("0039"):
                        clean_value = clean_value[4:]
                    elif clean_value.startswith("39") and len(clean_value) >= 11:
                        candidate = clean_value[2:]
                        if candidate.startswith("3") or candidate.startswith("0"):
                            clean_value = candidate

                    if 8 <= len(clean_value) <= 11:
                        if (clean_value.startswith("0") and not clean_value.startswith("00")) or clean_value.startswith("3"):
                            numbers.add(clean_value)

            if not numbers:
                raise Exception("Nessuna numerazione valida trovata")

            final_output = "\r\n".join(sorted(numbers)) + "\r\n"
            zip_buffer = io.BytesIO()

            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
                zip_file.writestr("lista.txt", final_output.encode("utf-8"))

            zip_buffer.seek(0)

            self.send_response(200)
            self.send_header("Content-type", "application/zip")
            self.send_header("Content-Disposition", 'attachment; filename="lista.zip"')
            self.end_headers()
            self.wfile.write(zip_buffer.read())
        except Exception as error:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Errore: {str(error)}".encode())
