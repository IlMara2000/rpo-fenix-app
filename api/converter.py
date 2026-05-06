from http.server import BaseHTTPRequestHandler
import cgi
import io
import zipfile

import pandas as pd


def normalize_number(value):
    raw_value = str(value).strip()
    if not raw_value or raw_value.lower() in ["nan", "none"]:
        return None

    candidate_value = raw_value.split(",", 1)[0].strip()
    clean_value = "".join(filter(str.isdigit, candidate_value))
    if not clean_value:
        return None

    if clean_value.startswith("0039"):
        clean_value = clean_value[4:]
    elif clean_value.startswith("39") and len(clean_value) >= 11:
        candidate = clean_value[2:]
        if candidate.startswith("3") or candidate.startswith("0"):
            clean_value = candidate

    if 8 <= len(clean_value) <= 11:
        if (clean_value.startswith("0") and not clean_value.startswith("00")) or clean_value.startswith("3"):
            return clean_value

    return None


def numbers_from_excel(file_data):
    df = pd.read_excel(io.BytesIO(file_data), engine="openpyxl", header=None, dtype=str)
    numbers = set()

    for row in df.values:
        for cell in row:
            number = normalize_number(cell)
            if number:
                numbers.add(number)

    return numbers


def text_from_txt(file_data):
    try:
        text = file_data.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = file_data.decode("latin-1")

    lines = text.splitlines()
    return "\r\n".join(lines) + ("\r\n" if lines else "")


def zip_numbers(numbers):
    return zip_text(text_from_numbers(numbers))


def text_from_numbers(numbers):
    return "\r\n".join(sorted(numbers)) + "\r\n"


def zip_text(text):
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("lista.txt", text.encode("utf-8"))

    zip_buffer.seek(0)
    return zip_buffer


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={"REQUEST_METHOD": "POST"},
            )

            if "excel" not in form and "txt" not in form:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Errore: File non ricevuto")
                return

            content_type = "application/zip"
            disposition = 'attachment; filename="lista.zip"'

            if "txt" in form:
                file_data = form["txt"].file.read()
                zip_buffer = zip_text(text_from_txt(file_data))
                body = zip_buffer.read()
            else:
                file_data = form["excel"].file.read()
                numbers = numbers_from_excel(file_data)

                if not numbers:
                    raise Exception("Nessuna numerazione valida trovata")

                if form.getfirst("output") == "txt":
                    body = text_from_numbers(numbers).encode("utf-8")
                    content_type = "text/plain; charset=utf-8"
                    disposition = 'attachment; filename="lista.txt"'
                else:
                    zip_buffer = zip_numbers(numbers)
                    body = zip_buffer.read()

            self.send_response(200)
            self.send_header("Content-type", content_type)
            self.send_header("Content-Disposition", disposition)
            self.end_headers()
            self.wfile.write(body)
        except Exception as error:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Errore: {str(error)}".encode())
